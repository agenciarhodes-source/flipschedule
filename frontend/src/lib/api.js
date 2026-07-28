import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API,
    headers: { "Content-Type": "application/json" },
});

// tenant-scoped helpers
export const tApi = (slug) => ({
    dashboard: () => api.get(`/tenants/${slug}/dashboard`).then((r) => r.data),
    professionals: () => api.get(`/tenants/${slug}/professionals`).then((r) => r.data),
    createProfessional: (body) => api.post(`/tenants/${slug}/professionals`, body).then((r) => r.data),
    updateProfessional: (id, body) => api.patch(`/tenants/${slug}/professionals/${id}`, body).then((r) => r.data),
    deleteProfessional: (id) => api.delete(`/tenants/${slug}/professionals/${id}`).then((r) => r.data),

    resources: () => api.get(`/tenants/${slug}/resources`).then((r) => r.data),
    createResource: (body) => api.post(`/tenants/${slug}/resources`, body).then((r) => r.data),
    deleteResource: (id) => api.delete(`/tenants/${slug}/resources/${id}`).then((r) => r.data),

    procedures: () => api.get(`/tenants/${slug}/procedures`).then((r) => r.data),
    createProcedure: (body) => api.post(`/tenants/${slug}/procedures`, body).then((r) => r.data),
    updateProcedure: (id, body) => api.patch(`/tenants/${slug}/procedures/${id}`, body).then((r) => r.data),
    deleteProcedure: (id) => api.delete(`/tenants/${slug}/procedures/${id}`).then((r) => r.data),

    patients: (q) => api.get(`/tenants/${slug}/patients`, { params: q ? { q } : {} }).then((r) => r.data),
    createPatient: (body) => api.post(`/tenants/${slug}/patients`, body).then((r) => r.data),
    getPatient: (id) => api.get(`/tenants/${slug}/patients/${id}`).then((r) => r.data),

    leads: () => api.get(`/tenants/${slug}/leads`).then((r) => r.data),
    createLead: (body) => api.post(`/tenants/${slug}/leads`, body).then((r) => r.data),
    updateLead: (id, body) => api.patch(`/tenants/${slug}/leads/${id}`, body).then((r) => r.data),

    appointments: (start, end) =>
        api.get(`/tenants/${slug}/appointments`, { params: { start, end } }).then((r) => r.data),
    createAppointment: (body) => api.post(`/tenants/${slug}/appointments`, body).then((r) => r.data),
    updateAppointment: (id, body) => api.patch(`/tenants/${slug}/appointments/${id}`, body).then((r) => r.data),
    deleteAppointment: (id) => api.delete(`/tenants/${slug}/appointments/${id}`).then((r) => r.data),

    plans: () => api.get(`/tenants/${slug}/treatment_plans`).then((r) => r.data),
    createPlan: (body) => api.post(`/tenants/${slug}/treatment_plans`, body).then((r) => r.data),
    updatePlan: (id, body) => api.patch(`/tenants/${slug}/treatment_plans/${id}`, body).then((r) => r.data),

    conversations: () => api.get(`/tenants/${slug}/conversations`).then((r) => r.data),
    messages: (cid) => api.get(`/tenants/${slug}/conversations/${cid}/messages`).then((r) => r.data),
    sendMessage: (cid, text) =>
        api.post(`/tenants/${slug}/conversations/${cid}/messages`, { text_content: text }).then((r) => r.data),
});

export const publicApi = {
    getPlan: (token) => api.get(`/plans/public/${token}`).then((r) => r.data),
    acceptPlan: (token, body) => api.post(`/plans/public/${token}/accept`, body).then((r) => r.data),
    rejectPlan: (token, reason) =>
        api.post(`/plans/public/${token}/reject`, null, { params: { reason } }).then((r) => r.data),
};

export const listTenants = () => api.get("/tenants").then((r) => r.data);
export const getTenant = (slug) => api.get(`/tenants/${slug}`).then((r) => r.data);
export const seedDemo = () => api.post("/seed").then((r) => r.data);
