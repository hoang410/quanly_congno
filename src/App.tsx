import "./App.css";

import ModelDrivenApp from "./components/ModelDrivenApp";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import LoginPage from "./pages/LoginPage";

function AppContent() {
    const { user } = useAuth();

    if (user === null) {
        return <LoginPage />;
    }

    return <ModelDrivenApp />;
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
