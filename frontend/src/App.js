import './App.css';
import Dashboard from "./views/Dashboard";
import { TaskProvider } from "./services/TaskContext";

function App() {
    return (
        <TaskProvider>
            <Dashboard />
        </TaskProvider>
    );
}

export default App;
