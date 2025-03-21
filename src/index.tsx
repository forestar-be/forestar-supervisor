import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { Provider } from 'react-redux';
import { store } from './store/index';
import { AllCommunityModule, ModuleRegistry, provideGlobalGridOptions } from 'ag-grid-community';
// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);
// Mark all grids as using legacy themes
provideGlobalGridOptions({ theme: "legacy"});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
