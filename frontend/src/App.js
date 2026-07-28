import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Agenda from "@/pages/Agenda";
import Inbox from "@/pages/Inbox";
import Crm from "@/pages/Crm";
import Orcamentos from "@/pages/Orcamentos";
import Pacientes from "@/pages/Pacientes";
import PacienteDetalhe from "@/pages/PacienteDetalhe";
import Configuracoes from "@/pages/Configuracoes";
import PublicPlan from "@/pages/PublicPlan";
import AppShell from "@/components/AppShell";

function App() {
    return (
        <div className="App">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/plano/:token" element={<PublicPlan />} />

                    <Route path="/:slug" element={<AppShell />}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="agenda" element={<Agenda />} />
                        <Route path="inbox" element={<Inbox />} />
                        <Route path="crm" element={<Crm />} />
                        <Route path="orcamentos" element={<Orcamentos />} />
                        <Route path="pacientes" element={<Pacientes />} />
                        <Route path="pacientes/:id" element={<PacienteDetalhe />} />
                        <Route path="configuracoes" element={<Configuracoes />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
            <Toaster
                position="top-right"
                theme="dark"
                toastOptions={{
                    style: {
                        background: "hsl(207 24% 15%)",
                        color: "hsl(38 39% 91%)",
                        border: "1px solid hsl(210 20% 21%)",
                    },
                }}
            />
        </div>
    );
}

export default App;
