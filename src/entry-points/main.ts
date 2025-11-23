import { createApp } from 'vue';
import Dashboard from '../components/Dashboard.vue';
import type { EntryPoint } from '../types/extension';

/**
 * Main Entry Point
 * Renders the Baptizo Dashboard using Vue.js
 */
const mainEntryPoint: EntryPoint = ({ element }) => {
    console.log('[Baptizo] Initializing Main Dashboard');

    const app = createApp(Dashboard);
    app.mount(element);

    return () => {
        console.log('[Baptizo] Unmounting Dashboard');
        app.unmount();
    };
};

export default mainEntryPoint;
