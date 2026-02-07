<template>
  <div class="baptizo-dashboard">
    <!-- ADMIN VIEW (full page replacement) -->
    <div v-if="showAdminView" class="admin-fullscreen">
      <Admin @close="showAdminView = false" />
    </div>

    <!-- DASHBOARD VIEW (normal view) -->
    <template v-else>
    <!-- Header -->
    <header class="dashboard-header">
      <div class="logo-area">
        <img src="/logo.png" alt="Baptizo Logo" class="logo-img" />
        <h1 class="app-title">Baptizo Taufmanager</h1>
      </div>
      <div class="actions">
        <!-- ADMIN Button (FIRST - leftmost position, same style as Report button with border) -->
        <button 
          @click="goToAdminEntryPoint" 
          class="ct-button ct-button--report"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Admin
        </button>
        
        <select v-if="settings.multiSiteMode" class="location-filter">
          <option value="">Alle Standorte</option>
          <option v-for="campus in settings.campuses" :key="campus.id" :value="campus.id">
            {{ campus.name }}
          </option>
        </select>
        
        <!-- Multi-Site Mode Toggle (Feature Preview) -->
        <div class="multisite-toggle" @click="handleMultiSiteToggle">
          <div class="toggle-switch" :class="{ active: multiSiteEnabled }">
            <div class="toggle-knob"></div>
          </div>
          <label class="toggle-label">Multi-Site</label>
        </div>
        
        <button @click="openReportModal" class="ct-button ct-button--report">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Report erstellen
        </button>
      <button @click="refreshData" class="ct-button ct-button--primary">
          <!-- Scaled up Refresh Icon (SVG) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span style="margin-left: 6px;">Refresh</span>
      </button>
        <button 
          v-if="user?.is_admin || user?.meta?.is_admin" 
          @click="currentTab = 'settings'" 
          class="ct-button ct-button--admin"
          style="background-color: #333; color: white; margin-left: 8px;"
        >
          <span class="icon">⚙️</span> System-Einstellungen
        </button>
      </div>
    </header>

    <!-- Config Warning (Hidden per user request) -->
    <!-- <div v-if="!loading && (!interestGroupId || !baptizedGroupId)" class="config-warning">
      ⚠ Konfiguration fehlt. Bitte konfiguriere die IDs im <a href="#" @click.prevent="goToAdminEntryPoint">Admin-Bereich</a>.
    </div> -->

    <!-- Tabs -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id" 
        class="tab-btn" 
        :class="{ active: currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Lade Daten...</p>
    </div>

    <!-- DASHBOARD TAB -->
    <div v-else-if="currentTab === 'dashboard'" class="dashboard-content">
      
      <!-- KPI Widgets (Dynamic) -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">INTERESSENTEN</span>
          <span class="kpi-value text-interessenten">{{ kpiInterested }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">SEMINARTEILNEHMER</span>
          <span class="kpi-value text-seminare">{{ kpiSeminars }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">GETAUFTE</span>
          <span class="kpi-value text-taufen">{{ kpiBaptisms }}</span>
        </div>
      </section>

      <!-- Chart Section -->
      <section class="master-chart-section">
        <div class="chart-header">
          <h3 class="chart-title">CHART</h3>
          <div class="chart-controls">
            <!-- Rolling Months -->
            <div class="btn-group">
              <button 
                v-for="months in [12, 24, 36]" 
                :key="months"
                class="chart-btn"
                :class="{ active: chartMode === 'rolling' && rollingMonths === months }"
                @click="setRollingMode(months)"
              >
                {{ months }} Mon
              </button>
            </div>
            <!-- Years (dynamic: current year and 2 previous) -->
            <div class="btn-group">
              <button 
                v-for="year in availableYears" 
                :key="year"
                class="chart-btn"
                :class="{ active: chartMode === 'years' && selectedYears.includes(year) }"
                @click="toggleYear(year)"
              >
                {{ year }}
              </button>
            </div>
          </div>
        </div>
        <div class="chart-container-large">
          <BaptismChart :data="chartData" />
        </div>
        <!-- Custom Legend -->
        <div class="chart-legend">
          <button 
            class="legend-btn"
            :class="{ active: visibleSeries.interessenten }"
            @click="toggleSeries('interessenten')"
          >
            <span class="legend-color" style="background: #92C9D6"></span>
            Interessenten
          </button>
          <button 
            class="legend-btn"
            :class="{ active: visibleSeries.seminare }"
            @click="toggleSeries('seminare')"
          >
            <span class="legend-color" style="background: #7383B2"></span>
            Seminarteilnehmer
          </button>
          <button 
            class="legend-btn"
            :class="{ active: visibleSeries.taufen }"
            @click="toggleSeries('taufen')"
          >
            <span class="legend-color" style="background: #FF9F43"></span>
            Getaufte
          </button>
        </div>
      </section>

      <!-- Global Filters -->
      <div class="global-filters">
        <span class="filter-label">ÜBERSICHT</span>
        <div class="filter-buttons">
          <button 
            v-for="filter in ['all', '>2w', '>6w', '>12w']" 
            :key="filter"
            class="filter-btn"
            :class="{ active: timeFilter === filter }"
            @click="timeFilter = filter"
          >
            {{ filter === 'all' ? 'Alle' : filter.toUpperCase() }}
          </button>
        </div>
      </div>

      <!-- 4 Lists Grid -->
      <section class="lists-grid">
        <!-- List 1 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehendes Seminar</h4>
            <span class="badge badge-count">{{ listSeminarPending.length }}</span>
          </div>
          <div v-if="listSeminarPending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listSeminarPending" @click="openPersonModal" />
        </div>

        <!-- List 2 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehende Taufe</h4>
            <span class="badge badge-count">{{ listBaptismPending.length }}</span>
          </div>
          <div v-if="listBaptismPending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listBaptismPending" @click="openPersonModal" />
        </div>

        <!-- List 3 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehende Urkunde</h4>
            <span class="badge badge-count">{{ listCertificatePending.length }}</span>
          </div>
          <div v-if="listCertificatePending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listCertificatePending" @click="openPersonModal" />
        </div>

        <!-- List 4 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehende Integration</h4>
            <span class="badge badge-count">{{ listIntegrationPending.length }}</span>
          </div>
          <div v-if="listIntegrationPending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listIntegrationPending" @click="openPersonModal" />
        </div>
      </section>
    </div>

    <!-- PERSONEN TAB -->
    <div v-else-if="currentTab === 'people'" class="people-content">
      <!-- Single row: Filters left, Buttons right (No title) -->
      <div class="people-header">
        <div class="filter-bar">
          <button @click="peopleFilter = 'all'" :class="{ active: peopleFilter === 'all' }">Alle</button>
          <button @click="peopleFilter = 'interested'" :class="{ active: peopleFilter === 'interested' }">Interessenten</button>
          <button @click="peopleFilter = 'baptized'" :class="{ active: peopleFilter === 'baptized' }">Getaufte</button>
          <button @click="peopleFilter = 'problems'" :class="{ active: peopleFilter === 'problems' }">Fokus</button>
        </div>
        <div class="management-buttons">
          <button @click="handleOnboarding" class="ct-button ct-button--onboarding">
            <span class="icon">
              <!-- Plus SVG -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </span> Onboarding
          </button>
          <button @click="handleOffboarding" class="ct-button ct-button--offboarding">
            <span class="icon">
              <!-- LogOut SVG -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span> Offboarding
          </button>
        </div>
      </div>
      <table class="people-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Mails</th>
            <th>Onboarding</th>
            <th>Seminar</th>
            <th>Taufe</th>
            <th>Urkunde</th>
            <th>Integriert</th>
            <th style="text-align: right;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="person in filteredPersons" :key="person.id" :class="{ inactive: person.status === 'inactive' }">
            <td>
              <div class="person-cell">
                <div 
                  class="avatar-small" 
                  :style="{ backgroundColor: getAvatarColor(person), color: getAvatarTextColor(getAvatarColor(person)) }"
                >
                  <span v-if="!person.imageUrl || person.imageUrl.includes('ui-avatars') || person.imageUrl.includes('dicebear')" class="initials-small">{{ getInitials(person) }}</span>
                  <img v-else :src="person.imageUrl" alt="Avatar" class="avatar-img-small" />
                </div>
                {{ person.firstName }} {{ person.lastName }}
              </div>
            </td>
            <td>{{ person.status === 'active' ? 'Aktiv' : 'Inaktiv' }}</td>
            <td>{{ formatDate(person.entry_date) }}</td>
            <td>
              <span v-if="person.fields.seminar_besucht_am" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td>
              <span v-if="person.fields.getauft_am" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td>
              <span v-if="person.fields.urkunde_ueberreicht" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td>
              <span v-if="person.fields.in_gemeinde_integriert" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td style="text-align: right;">
              <button class="edit-btn" @click="openPersonModal(person)">Bearbeiten</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Onboarding Modal -->
    <OnboardingModal 
      v-if="showOnboardingModal" 
      @close="showOnboardingModal = false"
      @personAdded="handlePersonAdded"
    />
    
    <!-- Offboarding Modal -->
    <OffboardingModal 
      v-if="showOffboardingModal" 
      :persons="allPersons"
      @close="showOffboardingModal = false"
      @personRemoved="handlePersonRemoved"
    />

    <!-- Person Detail Modal -->
    <PersonDetailModal
      v-if="showPersonModal && selectedPerson"
      :person="selectedPerson"
      @close="showPersonModal = false"
      @update="handlePersonUpdated"
    />

    <!-- EVENTS TAB -->
    <div v-else-if="currentTab === 'events'" class="events-content">
      <EventList ref="eventListRef" @create="handleCreateEvent" />
    </div>

    <!-- SETTINGS TAB -->
    <div v-else-if="currentTab === 'settings'" class="settings-content">
      <SettingsTab :settings="settings || {}" @update="updateSettings" />
    </div>

    <!-- HILFE TAB -->
    <div v-else-if="currentTab === 'intro'" class="help-content">
      <!-- Hero Section -->
      <section class="help-hero">
        <!-- Intro Card -->
        <div class="intro-card">
          <div class="help-title-badge">Baptizo Taufmanager</div>
          <p class="intro-text">
            Organisiert den gesamten Taufprozess deiner Gemeinde – vom ersten Interesse bis zur Integration. 
            Unser Plugin führt deine Leiter smart durch alle Schritte: Anmeldung, Taufseminar, Taufe, Follow-up – strukturiert, automatisiert und nachvollziehbar.
            <strong> Weil jeder Mensch zählt.</strong>
          </p>
        </div>

        <!-- Benefits Grid -->
        <div class="benefits-grid">
          <div class="benefit-card">
            <div class="benefit-icon">
              <!-- Clarity (Eye) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <h3>Klarheit</h3>
            <p>Du siehst jederzeit, wo sich eine Person im Prozess befindet.</p>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">
              <!-- Structure (Clipboard/Layout) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </div>
            <h3>Struktur</h3>
            <p>Durchdachtes Gruppenkonzept und Event-Management.</p>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">
              <!-- Automation (Zap) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <h3>Automatisierung</h3>
            <p>E-Mails und Erinnerungen laufen automatisch.</p>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">
              <!-- Relief (Target/User Check) -->
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3>Entlastung</h3>
            <p>Leiter werden eigenständig an Tasks erinnert.</p>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">
              <!-- Reporting (Bar Chart) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h3>Reporting</h3>
            <p>Drop-offs und Status auf einen Blick.</p>
          </div>
          <div class="benefit-card">
            <div class="benefit-icon">
              <!-- Multisite (Building/Layers) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                 <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                 <polyline points="2 17 12 22 22 17"></polyline>
                 <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <h3>Multisite-fähig</h3>
            <p>Für Gemeinden mit mehreren Standorten.</p>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="faq-section">
        <div class="faq-title-card">
          <div class="help-title-badge">Häufige Fragen & Antworten (FAQs)</div>
          <p class="faq-subtitle">
            Schnelle Hilfe zu den wichtigsten Themen – von Onboarding bis Mailversand.<br>
            Nicht gefunden, was du suchst? <a @click="currentTab = 'about'" class="faq-contact-link">Kontaktiere uns gerne</a>.
          </p>
        </div>
        <div class="faq-list">
          <div 
            v-for="(faq, index) in faqs" 
            :key="index" 
            class="faq-item"
            :class="{ active: faq.open }"
          >
            <div class="faq-question" @click="toggleFaq(index)">
              <span>{{ faq.question }}</span>
              <span class="faq-arrow">
                <!-- Chevron Down if Open, Right if Closed -->
                <svg v-if="faq.open" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
            </div>
            <div v-if="faq.open" class="faq-answer">
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ÜBER UNS TAB -->
    <div v-else-if="currentTab === 'about'" class="about-content">
      <div class="about-grid">
        <!-- Left Column: Vision -->
        <div class="about-column-left">
          <div class="about-card vision">
            <h2 class="about-headline vision">UNSERE VISION</h2>
            <p class="about-text">
              Wir existieren, um Gemeinden dabei zu unterstützen, ihren Missionsauftrag kraftvoll zu erfüllen. 
              Unser Anliegen: Das kraftvolle Zeichen der Wassertaufe sichtbarer machen - regelmäßig und ohne großen Aufwand.
            </p>
            
            <!-- Stats Grid -->
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-icon">
                  <!-- Clock SVG -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div class="stat-value">15 Minuten</div>
                <div class="stat-label">für den Aufbau</div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">
                  <!-- Waves SVG -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
                    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
                    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
                  </svg>
                </div>
                <div class="stat-value">10.000+</div>
                <div class="stat-label">sichere Taufen</div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">
                  <!-- Globe SVG -->
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <div class="stat-value">250+</div>
                <div class="stat-label">Kunden in acht Ländern</div>
              </div>
            </div>

            <!-- Contact Info (Moved here) -->
            <div class="contact-grid">
              <div class="contact-item">
                <span class="contact-label">WEB</span>
                <a href="https://www.baptizo.church" target="_blank" class="contact-link">www.baptizo.church</a>
              </div>
              <div class="contact-item">
                <span class="contact-label">EMAIL</span>
                <a href="mailto:mail@baptizo.church" class="contact-link">mail@baptizo.church</a>
              </div>
              <div class="contact-item">
                <span class="contact-label">TEL</span>
                <span class="contact-text">0160 976 876 10</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Heart & Mission -->
        <div class="about-column-right">
          <!-- Section 2: UNSER HERZ -->
          <div class="about-card">
            <h2 class="about-headline heart">UNSER HERZ</h2>
            <p class="about-text">Mit unserer Lösung ist Kirche bereit, wenn es die Menschen sind.</p>
            <blockquote class="about-quote">
              Mehr Taufen. Mehr Zeugnisse. Mehr Wachstum.
            </blockquote>
          </div>

          <!-- Section 3: MISSION -->
          <div class="about-card">
            <h2 class="about-headline mission">UNSERE MISSION</h2>
            <p class="about-text">
              Zu Gottes Ehre träumen wir davon, ganz Europa mit 1000 mobilen Taufbecken zu fluten.
            </p>
            <blockquote class="about-quote">
              Weil jede Taufe zählt!
            </blockquote>
          </div>
        </div>
      </div>
    </div>

    <!-- ADMIN TAB (only for users with admin permissions) -->
    <div v-else-if="currentTab === 'admin'" class="admin-content">
      <Admin />
    </div>

    </template>

    <!-- Footer -->
    <footer class="baptizo-footer">
      <p>Powered by <a href="https://www.baptizo.church" target="_blank">Baptizo – Mobile Taufbecken</a></p>
    </footer>

    <!-- Person Modal -->
    <!-- Toast Notification -->
    <Transition name="fade">
        <div v-if="showToast" class="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-xl z-50 flex items-center gap-3 border border-gray-700">
            <div class="text-green-400 text-xl">✓</div>
            <div>
                <p class="font-medium text-sm">{{ toastMessage }}</p>
            </div>
            <button @click="showToast = false" class="ml-4 text-gray-400 hover:text-white">✕</button>
        </div>
    </Transition>

    <!-- Loading Overlay for Sync -->
    <div v-if="isSyncing" class="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 text-xs font-medium animate-pulse">
        <span>↻</span> Prüfe Meilensteine & Gruppen...
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { PersonService } from '../services/personService';
import type { BaptizoGroup, BaptizoPerson, BaptizoEvent } from '../types/baptizo-types';
import BaptismChart from './BaptismChart.vue';
import PersonList from './PersonList.vue';
import EventList from './EventList.vue';
import PersonDetailModal from './PersonDetailModal.vue';
import SettingsTab from './SettingsTab.vue';
import Admin from './Admin.vue';
import OnboardingModal from './OnboardingModal.vue';
import OffboardingModal from './OffboardingModal.vue';
import { DEFAULT_SETTINGS } from '../types/baptizo-settings';
import type { BaptizoSettings } from '../types/baptizo-settings';
import { getAdminSettings, type AdminSettings } from '../lib/kv-store';

const props = defineProps<{
  user?: any;
  onNavigate?: (target: string) => void;
}>();

// Debug: Log user object to find correct admin property
console.log('[Baptizo] Current User:', props.user);

function goToAdminEntryPoint() {
  console.log('[Baptizo] Switching to Admin View (Internal State)');
  showAdminView.value = true;
}

const provider = new PersonService();
const loading = ref(true);
const groups = ref<BaptizoGroup[]>([]);
const events = ref<BaptizoEvent[]>([]);
const settings = ref<BaptizoSettings>({ ...DEFAULT_SETTINGS });
const currentTab = ref('dashboard');
const showAdminView = ref(false);
const selectedPerson = ref<BaptizoPerson | null>(null);
const adminSettings = ref<AdminSettings | null>(null);
const showOnboardingModal = ref(false);
const showOffboardingModal = ref(false);
const eventListRef = ref<any>(null); // Reference to EventList component



const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'people', label: 'Personen' },
  { id: 'events', label: 'Termine' },
  { id: 'settings', label: 'E-Mails' },
  { id: 'intro', label: 'Hilfe' },
  { id: 'about', label: 'Über uns' }
];

// Chart State
const chartMode = ref<'rolling' | 'years'>('rolling');
const rollingMonths = ref(12);
const selectedYears = ref<number[]>([2025]);
const visibleSeries = ref({ interessenten: true, seminare: true, taufen: true });


const currentYear = new Date().getFullYear();
const availableYears = [currentYear - 2, currentYear - 1, currentYear];

// Filter State
const timeFilter = ref('all');
const peopleFilter = ref('all');

// Multi-Site Mode Toggle (Feature Preview)
const multiSiteEnabled = ref(false);

const handleMultiSiteToggle = () => {
  // First: Toggle ON (visual feedback)
  multiSiteEnabled.value = true;
  
  // Then: Show alert after short delay
  setTimeout(() => {
    alert('🚧 Feature in Entwicklung');
    // After alert dismissed: Toggle back OFF
    multiSiteEnabled.value = false;
  }, 200);
};

// FAQ Data for Help Tab
const faqs = ref([
  {
    question: 'Wie starte ich den Prozess für eine neue Person?',
    answer: 'Navigiere zum Tab "Personen" und klicke oben rechts auf den Button "+ Onboarding". Dort kannst du eine Person direkt aus der ChurchTools-Datenbank suchen und importieren. Wähle einfach den Namen aus – das System übernimmt automatisch das Profilbild und erste Stammdaten.',
    open: false
  },
  {
    question: 'Wann und wie werden E-Mails versendet?',
    answer: 'Der E-Mail-Versand wird über den Tab "E-Mails" gesteuert. Wichtig: Der automatische Versand erfolgt nur, wenn der Schalter "Mailversand" aktiviert ist. Das System prüft dann täglich (beim Öffnen der App), ob für ein Event (z.B. Taufseminar oder Taufe) eine E-Mail-Vorlage fällig ist. E-Mails gehen grundsätzlich nur an Personen, die im Dashboard den Status "Aktiv" haben.',
    open: false
  },
  {
    question: 'Wie trage ich eine Taufe oder ein Seminar ein?',
    answer: 'Suche die Person in der Liste (Tab "Personen") und klicke auf "Bearbeiten". Dort findest du Checkboxen für die einzelnen Schritte (Seminar, Taufe, Urkunde, Integration). Wenn du einen Haken setzt, wird automatisch das heutige Datum eingetragen – du kannst dieses Datum aber auch manuell anpassen, falls das Ereignis schon stattgefunden hat.',
    open: false
  },
  {
    question: 'Was bedeutet der Filter "Fokus"?',
    answer: 'Der "Fokus"-Filter ist dein intelligenter Assistent. Er zeigt dir gezielt Personen an, bei denen der Prozess ins Stocken geraten ist – zum Beispiel, weil sie zwar das Seminar besucht haben, aber noch keinen Tauftermin haben, oder weil die Integration nach der Taufe noch aussteht. Nutze diesen Filter, um niemanden zu vergessen.',
    open: false
  },
  {
    question: 'Wie nutze ich das Chart auf dem Dashboard?',
    answer: 'Das Diagramm visualisiert deine Tauf-Statistiken über die Zeit. Du kannst oben rechts zwischen einer rollierenden Ansicht (letzte 12, 24 oder 36 Monate) und einer festen Jahresansicht wechseln. Klicke auf die farbigen Punkte in der Legende unter dem Chart, um einzelne Datenreihen (Interessenten, Seminarteilnehmer, Getaufte) ein- oder auszublenden.',
    open: false
  },
  {
    question: 'Was passiert beim "Offboarding"?',
    answer: 'Das Offboarding dient dazu, den Prozess sauber abzuschließen. Wenn eine Person integriert ist oder kein Interesse mehr hat, kannst du sie über den Button "Offboarding" aus dem aktiven Dashboard entfernen. Ihre Daten bleiben in ChurchTools erhalten, aber sie taucht hier nicht mehr in den offenen Listen auf und erhält keine weiteren automatischen Tauf-Mails.',
    open: false
  },
  {
    question: 'Kann ich die Texte der automatischen E-Mails anpassen?',
    answer: 'Ja, absolut. Im Reiter "E-Mails" findest du links alle konfigurierten Vorlagen für Seminare und Taufen. Klicke auf eine Vorlage, um Betreff, Inhalt, Zeitpunkt und Empfänger (Person oder Leiter) anzupassen. Du kannst dort auch komplett neue Vorlagen für spezielle Situationen erstellen.',
    open: false
  }
]);

const toggleFaq = (index: number) => {
  faqs.value[index].open = !faqs.value[index].open;
};

// Data Loading
const isSyncing = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
const showPersonModal = ref(false);

// Note: loadData and refreshData are defined below with Service Integration

// --- Email Service Integration ---
import { EmailService } from '../services/emailService';
import { EventService } from '../services/eventService';

const emailService = new EmailService();
const eventService = new EventService();

const checkEmailsOnStart = async () => {
    // Only run if settings loaded
    if (!settings.value) return;
    
    // Fetch events for the check
    const allEvents = await eventService.getEvents();
    
    // Run Check
    const logs = await emailService.checkAndSendEmails(settings.value, allEvents);
    
    if (logs.length > 0) {
        console.group("📧 [Baptizo Email Service] Report");
        logs.forEach(l => console.log(l));
        console.groupEnd();
    }
};

const loadData = async () => {
  loading.value = true;
  try {
    // Parallel fetch
    const [groupsData, settingsData, adminCfg, eventsDataRes] = await Promise.all([
      provider.getGroups(),
      provider.getSettings(),
      getAdminSettings(),
      eventService.getEvents()
    ]);
    
    groups.value = groupsData || [];
    settings.value = settingsData || { ...DEFAULT_SETTINGS };
    adminSettings.value = adminCfg;
    events.value = eventsDataRes || [];
    
    // Run Email Check (Non-blocking)
    checkEmailsOnStart();
    
  } catch (e) {
    console.error('Failed to load data', e);
  } finally {
    loading.value = false;
  }
};

const refreshData = async () => {
  await loadData();
  if (eventListRef.value) {
    await eventListRef.value.refresh();
  }
};

const updateSettings = async (newSettings: BaptizoSettings) => {
  try {
    await provider.updateSettings(newSettings);
    settings.value = newSettings;
    await loadData();
  } catch (e) {
    console.error('Failed to save settings', e);
  }
};

// Overwrite the loadData function in the script
// NOTE: I am using replace_file_content on the file, so I will replace the existing loadData function.
// updateSettings already defined above

const openReportModal = () => alert("🚧 Feature in Entwicklung");
const handleCreateEvent = async (e: any) => { await provider.createEvent(e); await loadData(); };

// Modal Handlers
const openPersonModal = (p: BaptizoPerson) => { 
  selectedPerson.value = p; 
  showPersonModal.value = true;
};

const handlePersonAdded = async () => {
  await loadData();
  showOnboardingModal.value = false;
  showToast.value = true;
  toastMessage.value = 'Person erfolgreich hinzugefügt';
  setTimeout(() => showToast.value = false, 3000);
};

// Branding Colors (Same as PersonList.vue)
const BRAND_PALETTE = [
  '#92C9D6', // Turquoise (Interessenten)
  '#7383B2', // Purple (Seminare)
  '#FF9F43'  // Orange (Taufen)
];

const getAvatarTextColor = (bgColor: string) => {
  if (bgColor === '#92C9D6') return '#3C3C5B'; // Turquoise -> Dark Purple
  if (bgColor === '#FF9F43') return '#521D15'; // Orange -> Dark Red/Brown
  return '#FFFFFF'; // Purple/Default -> White
};

const getAvatarColor = (person: BaptizoPerson) => {
  const str = (person.firstName || '') + (person.lastName || '') + (person.id || 0);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BRAND_PALETTE.length;
  return BRAND_PALETTE[index];
};

const getInitials = (person: BaptizoPerson) => {
  return (person.firstName?.charAt(0) || '') + (person.lastName?.charAt(0) || '');
};

const handlePersonUpdated = async (updatedPerson: BaptizoPerson) => {
  try {
    // Optimistic UI: Close immediately
    showPersonModal.value = false;
    // showToast.value = true;              <-- REMOVED per Ticket 2
    // toastMessage.value = 'Wird gespeichert...';
    
    // Background Update
    loading.value = true;
    await provider.updatePerson(updatedPerson);
    await loadData();
    
    // Success State
    // toastMessage.value = 'Erfolgreich gespeichert'; <-- REMOVED per Ticket 2
    // setTimeout(() => showToast.value = false, 3000);
    selectedPerson.value = null;
  } catch (e) {
    console.error('Failed to update person', e);
    alert('Fehler beim Speichern der Person.');
    showPersonModal.value = true; // Re-open on error? Or just alert.
  } finally {
    loading.value = false;
  }
};


const handlePersonRemoved = async () => {
  showOffboardingModal.value = false;
  await loadData();
};

const handleOnboarding = () => { showOnboardingModal.value = true; };
const handleOffboarding = () => { showOffboardingModal.value = true; };

// Helper Functions
const getDaysSince = (dateStr: string | undefined | null) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const filterByTime = (person: BaptizoPerson, dateField: string) => {
  if (timeFilter.value === 'all') return true;
  const dateStr = dateField === 'entry' ? person.entry_date : person.fields.getauft_am;
  if (!dateStr) return false;
  const days = getDaysSince(dateStr);
  if (timeFilter.value === '>2w') return days > 14;
  if (timeFilter.value === '>6w') return days > 42;
  if (timeFilter.value === '>12w') return days > 84;
  return true;
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// Chart Logic
const setRollingMode = (months: number) => {
  chartMode.value = 'rolling';
  rollingMonths.value = months;
  selectedYears.value = [];
};

const toggleYear = (year: number) => {
  if (chartMode.value === 'rolling') {
    chartMode.value = 'years';
    selectedYears.value = [year];
  } else {
    const index = selectedYears.value.indexOf(year);
    if (index === -1) {
      if (selectedYears.value.length < 3) {
        selectedYears.value.push(year);
      }
    } else {
      if (selectedYears.value.length > 1) {
        selectedYears.value.splice(index, 1);
      }
    }
  }
};

const toggleSeries = (series: 'interessenten' | 'seminare' | 'taufen') => {
  visibleSeries.value[series] = !visibleSeries.value[series];
};

// Chart Data
const chartData = computed(() => {
  const datasets: any[] = [];
  
  if (chartMode.value === 'rolling') {
    const labels: string[] = [];
    const intData: number[] = [];
    const semData: number[] = [];
    const baptData: number[] = [];
    
    const now = new Date();
    for (let i = rollingMonths.value - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('de-DE', { month: 'long', year: '2-digit' }));
      
      let intCount = 0, semCount = 0, baptCount = 0;
      
      
      groups.value.forEach(group => {
        group.members.forEach(m => {
          // 1. Interessenten (Entry Date)
          if (m.entry_date) {
            const ed = new Date(m.entry_date);
            if (ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()) {
              intCount++;
            }
          }
          
          // 2. Seminare (Seminar Date) - Independent check!
          if (m.fields.seminar_besucht_am) {
            const sd = new Date(m.fields.seminar_besucht_am);
            if (sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear()) {
              semCount++;
            }
          }

          // 3. Taufen (Baptism Date)
          if (m.fields.getauft_am) {
            const bd = new Date(m.fields.getauft_am);
            if (bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear()) {
              baptCount++;
            }
          }
        });
      });
      
      intData.push(intCount);
      semData.push(semCount);
      baptData.push(baptCount);
    }
    
    if (visibleSeries.value.interessenten) {
      datasets.push({
        label: 'Interessenten',
        data: intData,
        borderColor: '#92C9D6',
        solidColor: '#92C9D6',
        backgroundColor: 'rgba(146, 201, 214, 0.1)',
        tension: 0.4
      });
    }
    if (visibleSeries.value.seminare) {
      datasets.push({
        label: 'Seminare',
        data: semData,
        borderColor: '#7383B2',
        solidColor: '#7383B2',
        backgroundColor: 'rgba(115, 131, 178, 0.1)',
        tension: 0.4
      });
    }
    if (visibleSeries.value.taufen) {
      datasets.push({
        label: 'Taufen',
        data: baptData,
        borderColor: '#FF9F43',
        solidColor: '#FF9F43',
        backgroundColor: 'rgba(255, 159, 67, 0.1)',
        tension: 0.4
      });
    }
    
    return { labels, datasets };
    
  } else {
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const sortedYears = [...selectedYears.value].sort((a, b) => b - a);
    
    sortedYears.forEach((year, idx) => {
      // Progressive transparency: newest 100%, then 50%, then 20%
      let opacity;
      if (idx === 0) opacity = 1.0;      // Current/newest year
      else if (idx === 1) opacity = 0.5; // Previous year  
      else opacity = 0.2;                // Older years
      
      const intData = new Array(12).fill(0);
      const semData = new Array(12).fill(0);
      const baptData = new Array(12).fill(0);
      
      // Count from ALL persons in BOTH groups (single source of truth)
      groups.value.forEach(group => {
        group.members.forEach(person => {
          // Count Interessenten: based on entry_date
          if (person.entry_date) {
            const entryDate = new Date(person.entry_date);
            if (entryDate.getFullYear() === year) {
              intData[entryDate.getMonth()]++;
            }
          }
          
          // Count Seminare: based on seminar_besucht_am
          if (person.fields.seminar_besucht_am) {
            const seminarDate = new Date(person.fields.seminar_besucht_am);
            if (seminarDate.getFullYear() === year) {
              semData[seminarDate.getMonth()]++;
            }
          }
          
          // Count Taufen: based on getauft_am
          if (person.fields.getauft_am) {
            const baptismDate = new Date(person.fields.getauft_am);
            if (baptismDate.getFullYear() === year) {
              baptData[baptismDate.getMonth()]++;
            }
          }
        });
      });
      
      if (visibleSeries.value.interessenten) {
        datasets.push({
          label: `Interessenten '${year.toString().slice(-2)}`,
          data: intData,
          borderColor: `rgba(146, 201, 214, ${opacity})`,
          solidColor: '#92C9D6',
          backgroundColor: `rgba(146, 201, 214, ${opacity * 0.1})`,
          tension: 0.4
        });
      }
      if (visibleSeries.value.seminare) {
        datasets.push({
          label: `Seminarteilnehmer '${year.toString().slice(-2)}`,
          data: semData,
          borderColor: `rgba(115, 131, 178, ${opacity})`,
          solidColor: '#7383B2',
          backgroundColor: `rgba(115, 131, 178, ${opacity * 0.1})`,
          tension: 0.4
        });
      }
      if (visibleSeries.value.taufen) {
        datasets.push({
          label: `Taufen '${year.toString().slice(-2)}`,
          data: baptData,
          borderColor: `rgba(255, 159, 67, ${opacity})`,
          solidColor: '#FF9F43',
          backgroundColor: `rgba(255, 159, 67, ${opacity * 0.1})`,
          tension: 0.4
        });
      }
    });
    
    return { labels: months, datasets };
  }
});

// Dynamic KPIs (Event-Based Logic)
const kpiInterested = computed(() => {
  let count = 0;
  
  // Determine time range based on mode
  let startDate: Date, endDate: Date;
  
  if (chartMode.value === 'rolling') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - rollingMonths.value + 1, 1);
    endDate = now;
  } else {
    // Years mode: get min and max from selected years
    const years = [...selectedYears.value].sort();
    startDate = new Date(years[0], 0, 1);
    endDate = new Date(years[years.length - 1], 11, 31);
  }
  
  // Count ALL persons whose entry_date is in range (from both groups)
  groups.value.forEach(group => {
    group.members.forEach(person => {
      if (person.entry_date) {
        const entryDate = new Date(person.entry_date);
        if (entryDate >= startDate && entryDate <= endDate) {
          count++;
        }
      }
    });
  });
  
  return count;
});

const kpiSeminars = computed(() => {
  let count = 0;
  
  // Determine time range
  let startDate: Date, endDate: Date;
  
  if (chartMode.value === 'rolling') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - rollingMonths.value + 1, 1);
    endDate = now;
  } else {
    const years = [...selectedYears.value].sort();
    startDate = new Date(years[0], 0, 1);
    endDate = new Date(years[years.length - 1], 11, 31);
  }
  
  // Count ALL persons whose seminar_besucht_am is in range (from both groups)
  groups.value.forEach(group => {
    group.members.forEach(person => {
      if (person.fields.seminar_besucht_am) {
        const seminarDate = new Date(person.fields.seminar_besucht_am);
        if (seminarDate >= startDate && seminarDate <= endDate) {
          count++;
        }
      }
    });
  });
  
  return count;
});

const kpiBaptisms = computed(() => {
  let count = 0;
  
  // Determine time range
  let startDate: Date, endDate: Date;
  
  if (chartMode.value === 'rolling') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - rollingMonths.value + 1, 1);
    endDate = now;
  } else {
    const years = [...selectedYears.value].sort();
    startDate = new Date(years[0], 0, 1);
    endDate = new Date(years[years.length - 1], 11, 31);
  }
  
  // Count ALL persons whose getauft_am is in range (from ALL groups, matching other KPIs)
  groups.value.forEach(group => {
    group.members.forEach(person => {
      if (person.fields.getauft_am) {
        const baptismDate = new Date(person.fields.getauft_am);
        if (baptismDate >= startDate && baptismDate <= endDate) {
          count++;
        }
      }
    });
  });
  
  return count;
});

// Deduplicate all persons from all groups
const uniquePersons = computed(() => {
  const map = new Map();
  groups.value.forEach(g => {
    g.members.forEach(m => {
      // If person exists, merge fields (robustness)
      if (map.has(m.id)) {
        const existing = map.get(m.id);
        map.set(m.id, { ...existing, ...m, fields: { ...existing.fields, ...m.fields } });
      } else {
        map.set(m.id, m);
      }
    });
  });
  return Array.from(map.values());
});

// Lists (Robust: Source from uniquePersons, filter by Logic)

// 1. Seminar Pending: In Interest Group flow (status active), No Seminar date
const listSeminarPending = computed(() => {
  return uniquePersons.value
    .filter(m => m.status === 'active' && !m.fields.seminar_besucht_am && !m.fields.getauft_am && filterByTime(m, 'entry'))
    .map(p => ({ ...p, subtitle: `Interesse: ${formatDate(p.entry_date)}` }));
});

// 2. Baptism Pending: Has Seminar, No Baptism
const listBaptismPending = computed(() => {
  return uniquePersons.value
    .filter(m => m.status === 'active' && m.fields.seminar_besucht_am && !m.fields.getauft_am && filterByTime(m, 'entry'))
    .map(p => ({ ...p, subtitle: `Seminar: ${formatDate(p.fields.seminar_besucht_am)}` }));
});

// 3. Certificate Pending: Has Baptism, No Certificate
const listCertificatePending = computed(() => {
  return uniquePersons.value
    .filter(m => m.status === 'active' && m.fields.getauft_am && !m.fields.urkunde_ueberreicht && filterByTime(m, 'baptism'))
    .map(p => ({ ...p, subtitle: `Taufe: ${formatDate(p.fields.getauft_am)}` }));
});

// 4. Integration Pending: Has Certificate, No Integration
const listIntegrationPending = computed(() => {
  return uniquePersons.value
    .filter(m => m.status === 'active' && m.fields.getauft_am && m.fields.urkunde_ueberreicht && !m.fields.in_gemeinde_integriert && filterByTime(m, 'baptism'))
    .map(p => ({ ...p, subtitle: `Taufe: ${formatDate(p.fields.getauft_am)}` }));
});

// All persons from all groups (for offboarding modal)
const allPersons = uniquePersons; // alias for compatibility

// People Tab Filter (SORTED BY ONBOARDING DATE - FIFO)
const filteredPersons = computed(() => {
  let list = uniquePersons.value;
  if (peopleFilter.value === 'interested') list = list.filter(p => !p.fields.getauft_am);
  else if (peopleFilter.value === 'baptized') list = list.filter(p => p.fields.getauft_am);
  else if (peopleFilter.value === 'problems') {
    list = list.filter(p => {
      if (p.status !== 'active') return false;
      if (p.fields.getauft_am && (!p.fields.urkunde_ueberreicht || !p.fields.in_gemeinde_integriert)) return true;
      if (!p.fields.seminar_besucht_am && p.entry_date && getDaysSince(p.entry_date) > 180) return true;
      return false;
    });
  }
  // Sort by onboarding date ascending (FIFO - oldest first)
  return list.sort((a, b) => {
    const dateA = a.entry_date ? new Date(a.entry_date).getTime() : 0;
    const dateB = b.entry_date ? new Date(b.entry_date).getTime() : 0;
    
    // Smart Sort: Focus (problems) = ASC (Oldest first), Others = DESC (Newest first)
    if (peopleFilter.value === 'problems') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });
});

onMounted(() => loadData());
</script>

<style scoped>
:root {
  --baptizo-accent: #92C9D6;
  --baptizo-secondary: #7383B2;
  --baptizo-header-bg: #3C3C5B;
  --master-gap: 60px;
}

.baptizo-dashboard {
  color: #eee;
  background-color: #1a1a1a;
  min-height: 100vh; /* Full viewport height to prevent white space */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Header */
.dashboard-header {
  background-color: #3C3C5B;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.logo-area { 
  display: flex; 
  align-items: center; 
  gap: 1rem; 
}

.logo-img {
  height: 50px;
  width: auto;
}

.app-title { 
  margin: 0; 
  font-size: 1.5rem; 
  font-weight: bold;
  text-transform: uppercase;
}

.actions { 
  display: flex; 
  gap: 1rem; 
  align-items: center; 
}

/* Multi-Site Toggle (Feature Preview) */
.multisite-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem; /* Match ct-button exactly */
  background: rgba(0, 0, 0, 0.3); /* Dark background */
  border: 2px solid #92C9D6; /* Bright turquoise like Report button */
  border-radius: 4px; /* Match ct-button */
  transition: all 0.2s;
  cursor: pointer; /* Make whole container clickable */
}

.multisite-toggle:hover {
  border-color: #92C9D6;
  background: rgba(146, 201, 214, 0.1); /* Same as Report button hover */
}

.toggle-label {
  font-size: 0.85rem;
  color: #fff; /* White for better contrast */
  font-weight: 700; /* Bold like button text */
}

.toggle-switch {
  position: relative;
  width: 34px; /* Even smaller */
  height: 18px; /* Even smaller */
  background: #555;
  border-radius: 9px; /* Match smaller size */
  transition: background 0.3s;
  flex-shrink: 0;
  pointer-events: none; /* Don't intercept clicks - let parent handle */
}

.toggle-switch:hover {
  background: #666;
}

.toggle-switch.active {
  background: #7383B2;
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px; /* Even smaller */
  height: 14px; /* Even smaller */
  background: #ddd;
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-switch.active .toggle-knob {
  left: 18px; /* Adjust for smaller size */
  background: #fff;
}

.location-filter {
  padding: 0.5rem;
  border-radius: 4px;
  background: #2a2a2a;
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
}

.ct-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ct-button--primary {
  background-color: #92C9D6;
  color: #3C3C5B;
  border: 2px solid #92C9D6; /* Turquoise border */
}

.ct-button--secondary {
  background-color: #444;
  color: #fff;
}

.ct-button--report {
  background-color: rgba(0, 0, 0, 0.3); /* Dark background like multi-site */
  border: 2px solid #92C9D6;
  color: #fff; /* White text like multi-site */
}

.ct-button--report:hover {
  background-color: rgba(146, 201, 214, 0.1);
}

.ct-button.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

/* Tabs */
.tabs {
  background-color: #2a2a2a;
  padding: 0 2rem;
  border-bottom: 1px solid #444;
  display: flex;
  gap: 1rem;
}

.tab-btn {
  background: none;
  border: none;
  color: white;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.tab-btn.active {
  color: #92C9D6;
  font-weight: bold;
  border-bottom-color: #92C9D6;
}

/* Dashboard Content */
.dashboard-content {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 20px 0 20px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-height: calc(100vh - 200px); /* Fill viewport minus header/tabs/footer for sticky footer */
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.kpi-card {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 4px solid #444;
}

.kpi-label {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 0.5rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.kpi-value {
  font-size: 3rem;
  font-weight: bold;
}

.text-interessenten { color: #92C9D6; }
.text-seminare { color: #7383B2; }
.text-taufen { color: #FF9F43; }

/* Chart Section */
.master-chart-section {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.chart-title {
  font-size: 0.9rem;
  color: #888;
  margin: 0;
  font-weight: bold;
  letter-spacing: 1px;
}

.chart-container-large {
  height: 300px;
}

.chart-controls {
  display: flex;
  gap: 10px;
}

.btn-group {
  display: flex;
  gap: 2px;
  background: #333;
  padding: 2px;
  border-radius: 4px;
}

.chart-btn {
  background: transparent;
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.chart-btn.active {
  background: #92C9D6;
  color: #3C3C5B;
  font-weight: bold;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #444;
}

.legend-btn {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.legend-btn.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

/* Global Filters */
.global-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
}

.filter-label {
  font-size: 0.9rem;
  color: #888;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  background: #444;
  border: none;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #92C9D6;
  color: #3C3C5B;
  font-weight: bold;
}

/* Lists Grid */
.lists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 0;
}

.list-card {
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
  border-top: 4px solid #555;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: none;
}

.list-header h4 {
  margin: 0;
  font-size: 14px;
  color: #888;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.badge-count {
  background: #555;
  color: #fff;
}

.badge.success {
  background: #10b981;
  color: white;
}

.badge.pending {
  background: #6b7280;
  color: white;
}

/* Normale Schriftstärke für alle Namen in den 4 Listen-Boxen */
.lists-grid :deep(.person-name),
.lists-grid :deep(.name) {
    font-weight: normal !important;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: #666;
}

.trophy {
  font-size: 3rem;
  opacity: 0.3;
}

/* People Content */
.people-content {
  padding: 0 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 200px); /* Fill viewport minus header/tabs/footer for sticky footer */
}

.people-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;

}

.management-buttons {
  display: flex;
  gap: 0.5rem;
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  background: #1a1a1a;
  padding: 0.25rem;
  border-radius: 6px;
}

.filter-bar button {
  background: #444;
  border: none;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.filter-bar button.active {
  background: #3C3C5B;
  color: white;
  font-weight: bold;
}

.people-table {
  width: 100%;
  border-collapse: collapse;
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  table-layout: fixed;
}

.people-table th,
.people-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #444;
}

.people-table th {
  text-transform: uppercase;
  color: #888;
  font-size: 0.9rem;
  letter-spacing: 1px;
  font-weight: bold;
}

.people-table tr:last-child td {
  border-bottom: none;
}

/* Fixed column widths for stability */
.people-table th:nth-child(1),
.people-table td:nth-child(1) { width: 25%; }

/* Center Status Columns (2-7) */
.people-table th:nth-child(n+2):nth-child(-n+7),
.people-table td:nth-child(n+2):nth-child(-n+7) {
  text-align: center;
}

.people-table th:nth-child(2),
.people-table td:nth-child(2) { width: 10%; }
.people-table th:nth-child(3),
.people-table td:nth-child(3) { width: 12%; }
.people-table th:nth-child(4),
.people-table td:nth-child(4) { width: 10%; }
.people-table th:nth-child(5),
.people-table td:nth-child(5) { width: 10%; }
.people-table th:nth-child(6),
.people-table td:nth-child(6) { width: 10%; }
.people-table th:nth-child(7),
.people-table td:nth-child(7) { width: 10%; }
.people-table th:nth-child(8),
.people-table td:nth-child(8) { width: 13%; }



.people-table tr.inactive {
  opacity: 0.5;
}

.person-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-small {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  color: #1a1a1a; /* Match page background */
  font-size: 0.85rem;
  font-weight: bold;
  flex-shrink: 0;
  margin-right: 0.5rem; /* Gap to name */
}

.avatar-img-small {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Events & Settings */
/* Events & Settings */
.events-content {
  padding: 0 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 200px); /* Fill viewport minus header/tabs/footer for sticky footer */
}

.settings-content {
  padding: 0 20px; /* Match events-content */
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 200px); /* Fill viewport minus header/tabs/footer for sticky footer */
}

/* Help Content (Hilfe Tab) */
.help-content {
  padding: 0 20px;
  max-width: 1400px; /* Full page width like other tabs */
  margin: 0 auto;
  margin-top: 2rem; /* Increased spacing from tab bar to match Settings */
  min-height: calc(100vh - 200px);
}

/* Hero Section */
.help-hero {
  margin-bottom: 0; /* No margin - spacing handled by child elements */
}

/* Intro Card */
.intro-card {
  background: #2d2d44; /* Dark widget-style background */
  padding: 2rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  text-align: center;
}

/* Title Badge (Button-Style) */
.title-badge {
  display: inline-block;
  background: rgba(146, 201, 214, 0.15); /* Subtle turquoise background */
  color: #92C9D6;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.5rem 1.5rem;
  border-radius: 50px; /* Pill shape */
  margin-bottom: 1rem;
  font-size: 1rem;
  letter-spacing: 0.05em;
}

/* Intro Text */
.intro-text {
  color: #cccccc;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
  font-size: 0.95rem;
}

/* Benefits Grid */
.benefits-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 0; /* No bottom margin - spacing from next section's margin-top */
}

.benefit-card {
  background: #2a2a2a; /* Card background */
  padding: 1.5rem;
  border-radius: 8px; /* Standardized to 8px */
  text-align: center;
  transition: transform 0.2s;
}

.benefit-card:hover {
  background: #2f2f2f;
  transform: translateY(-4px);
}

.benefit-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  margin-bottom: 1rem;
  color: #fff; /* White as requested */
}

.benefit-card h3 {
  color: #92C9D6;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
  font-weight: bold;
}

.benefit-card p {
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

/* FAQ Section */
.faq-section {
  margin-top: 2rem; /* Match spacing between intro-card and benefits-grid */
}

.faq-title-card {
  background: #2d2d44; /* Same as intro-card */
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  text-align: center;
}

.faq-subtitle {
  color: #aaa;
  font-size: 0.9rem;
  margin: 0.5rem 0 0 0;
  line-height: 1.4;
}

.faq-contact-link {
  color: #92C9D6;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
}

.faq-contact-link:hover {
  color: #a8d9e5;
  text-decoration: underline;
}

.faq-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr); /* 2 columns for FAQs */
  gap: 1.5rem;
  max-width: 1400px; /* Full page width */
  margin: 0 auto;
}

.faq-item {
  margin-bottom: 0.5rem; /* Tighter spacing between questions */
  border-radius: 6px;
  overflow: hidden;
}

/* FAQ Title Override */
.faq-title-card .help-title-badge {
    color: #FF9F43;
    border-color: #FF9F43;
    background: rgba(255, 159, 67, 0.1); /* Optional Tint */
}

/* FAQ Link Override */
.faq-contact-link, .faq-contact-link a {
    color: #FF9F43 !important;
}
.faq-contact-link a:hover {
    color: #ffd6ad !important;
}

.faq-question {
  background: #2a2a2a;
  padding: 1.25rem 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
  font-weight: 500;
  font-size: 1rem;
}

.faq-question:hover {
  background: rgba(255, 159, 67, 0.1); /* Orange Tint */
  color: #FF9F43; /* Orange Text */
}

.faq-arrow {
  color: #FF9F43; /* Orange Always */
  font-size: 0.9rem;
  /* transition removed to avoid "weird spinning" */
  display: flex;
  align-items: center;
}

.faq-item.active .faq-arrow {
  color: #FF9F43; /* explicit */
  /* transform: rotate(90deg) REMOVED */
}

.faq-answer {
  background: rgba(255, 159, 67, 0.1); /* Subtle Orange Tint */
  padding: 1.25rem 1.5rem;
  color: #ccc;
  line-height: 1.6;
  border-top: 1px solid rgba(255, 159, 67, 0.2); /* Matching border */
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 900px) {
  .benefits-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .benefits-grid {
    grid-template-columns: 1fr;
  }
  
  .hero-title {
    font-size: 2rem;
  }
}

/* Footer */
.baptizo-footer {
  margin-top: 2rem; /* Reduced from 4rem to minimize gap on shorter pages */
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.7;
  border-top: none;
  padding: 2rem;
  background: #1a1a1a;
}

.baptizo-footer a {
  color: #92C9D6;
  text-decoration: none;
  font-weight: bold;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: #aaa;
}
/* Edit Button (Outline Style) */
.edit-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.4);
}

/* About Content (Über uns Tab) */
.about-content {
  max-width: 1400px; /* Full Width */
  margin: 2rem auto 0;
  padding: 0 20px;
}

.about-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: stretch;
}

.about-column-left {
  display: flex;
  flex-direction: column;
}

.about-column-right {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.about-card {
  background: #2d2d44;
  padding: 1.5rem; /* Reduced padding from 2rem to 1.5rem */
  border-radius: 8px;
  /* margin-bottom removed */
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Ensure flex children in right column share height */
.about-column-right .about-card {
  flex: 1;
  height: auto; /* Allow flex to control height */
}

/* ... */

/* Contact Grid - Distributed */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* Equal distribution */
  gap: 1.5rem;
  margin-top: 3rem; /* More space from top */
  text-align: left;
}

.contact-item {
  display: flex;
  flex-direction: column; /* Label top, Value bottom */
  gap: 0.25rem;
}


.about-headline {
  font-size: 1.5rem;
  font-weight: 800;
  text-transform: uppercase;
  margin: 0 0 1.5rem 0;
  letter-spacing: 0.05em;
}

.about-headline.vision {
  color: #92C9D6; /* Turquoise */
}

.about-headline.heart {
  color: #7383B2; /* Purple */
}

.about-headline.mission {
  color: #FF9F43; /* Orange */
}

.about-text {
  color: #ccc;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin-top: auto; /* Push to bottom */
  padding: 2rem 0; /* Increased padding (was 10px) */
}

.stat-item {
  text-align: center;
}

.stat-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  margin-bottom: 0.5rem;
  color: #fff;
}

/* Ensure SVG is centered in the flex container */
.stat-icon svg {
  display: block; 
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #fff !important;
  font-style: italic;
  margin-bottom: 0.5rem;
  font-family: inherit;
}

.stat-label {
  font-size: 0.9rem;
  color: #aaa;
  line-height: 1.4;
}

/* Quote */
.about-quote {
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
  color: #fff;
  text-align: center;
  margin: 0; 
  padding: 0;
  border-left: none;
}

.about-footer {
  font-weight: 600;
  color: #fff;
  margin-bottom: 1.5rem;
}

/* Contact Grid - Distributed 3 Columns */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 1/3 each */
  gap: 1.5rem;
  margin-top: 2rem;
  text-align: center;
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
}

.contact-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #7383B2; /* Muted Purple/Blue */
  letter-spacing: 0.1em;
}

.contact-link, .contact-text {
  color: #92C9D6; /* Turquoise as requested */
  font-weight: 500;
  text-decoration: none;
  font-size: 0.95rem;
}

.contact-link:hover {
  text-decoration: underline;
  color: #fff; /* White on hover */
}
/* Responsive for About section */
@media (max-width: 768px) {
  .stats-grid,
  .contact-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

.config-warning {
  background: #FEB2B2; /* Red-ish/Orange */
  color: #C53030;
  padding: 1rem;
  text-align: center;
  font-weight: bold;
  border-bottom: 2px solid #C53030;
}
.config-warning a {
  text-decoration: underline;
  color: #742A2A;
  cursor: pointer;
}

/* Force Help Title Style */
.help-title-badge {
  display: inline-block;
  background: rgba(146, 201, 214, 0.1);
  color: #92C9D6;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 1.5rem !important; /* Force increase */
  font-weight: bold !important;  /* BOLD as requested */
  text-transform: uppercase !important; /* UPPERCASE as requested */
  margin-bottom: 1.5rem;
  letter-spacing: 0.05em;
  line-height: 1.4;
}

/* Offboarding Button Accent - SOLID PURPLE */
.ct-button--offboarding {
  background: #3C3C5B !important; /* Deep Purple */
  color: white !important;
  border: none !important;
  transition: all 0.2s;
}

.ct-button--offboarding:hover {
  background: #4b4b6e !important;
}

.ct-button--offboarding .icon {
  color: white !important;
}

/* Onboarding Button Accent - SOLID TURQUOISE */
.ct-button--onboarding {
  background: #92C9D6 !important; /* Turquoise */
  color: #3C3C5B !important; /* Deep Purple Text */
  border: none !important;
  transition: all 0.2s;
}

.ct-button--onboarding:hover {
  background: #a8d5e0 !important;
}

.ct-button--onboarding .icon {
  color: #3C3C5B !important;
}
</style>
