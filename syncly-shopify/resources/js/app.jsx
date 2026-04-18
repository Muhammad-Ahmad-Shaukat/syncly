import '../css/app.css';
import './bootstrap';
import "@shopify/polaris/build/esm/styles.css";
import { createInertiaApp } from '@inertiajs/react';
import { AppProvider } from '@shopify/polaris';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import enTranslations from '@shopify/polaris/locales/en.json';



const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<AppProvider i18n={enTranslations}>
            <App {...props} />
        </AppProvider>);
    },
    progress: {
        color: '#4B5563',
    },
});
