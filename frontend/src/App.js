import './App.css';
import Dashboard from "./views/Dashboard";
import { TaskProvider } from "./services/TaskContext";
import { I18nProvider } from "./services/I18nContext";

function App() {
    return (
        <I18nProvider>
            <TaskProvider>
                <Dashboard />
            </TaskProvider>
        </I18nProvider>
    );
}

export default App;
