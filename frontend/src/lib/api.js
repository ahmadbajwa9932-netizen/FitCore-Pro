const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.error || "Something went wrong");
  }
  return data;
}

async function requestForm(path, method, formData) {
  const res = await fetch(`${API_BASE}${path}`, { method, body: formData, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export const api = {
  // license api
  getLicenseStatus: () => request("/api/license/status"),
  activateLicense: (payload) => request("/api/license/activate", { method: "POST", body: JSON.stringify(payload) }),
  renewLicense: (payload) => request("/api/license/renew", { method: "POST", body: JSON.stringify(payload) }),
  recoverLicense: (payload) => request("/api/license/recover", { method: "POST", body: JSON.stringify(payload) }),
  verifyUnlockKey: (payload) => request("/api/license/verify-unlock", { method: "POST", body: JSON.stringify(payload) }),
  renewLicenseEarly: (payload) => request("/api/license/renew-early", { method: "POST", body: JSON.stringify(payload) }),

// auth api
getAuthStatus: () => request("/api/auth/status"),
saveBusinessInfo: (formData) => requestForm("/api/auth/business-info", "POST", formData),
signup: (payload) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
logout: () => request("/api/auth/logout", { method: "POST" }),
getMe: () => request("/api/auth/me"),
getKnownEmails: () => request("/api/auth/known-emails"),
forgotPassword: (payload) => request("/api/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
resetPassword: (payload) => request("/api/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),


  // members api
  getMembers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/members${query ? `?${query}` : ""}`);
  },
  getMember: (id) => request(`/api/members/${id}`),
  getMemberHistory: (id) => request(`/api/members/${id}/history`),
  getMemberPayments: (id) => request(`/api/members/${id}/payments`),
  createMember: (formData) => requestForm("/api/members", "POST", formData),
  updateMember: (id, formData) => requestForm(`/api/members/${id}`, "PUT", formData),
  renewMember: (id, payload) => request(`/api/members/${id}/renew`, { method: "POST", body: JSON.stringify(payload) }),
resumeMember: (id) => request(`/api/members/${id}/resume`, { method: "PATCH" }),
  freezeMember: (id) => request(`/api/members/${id}/freeze`, { method: "PATCH" }),
  deleteMember: (id) => request(`/api/members/${id}`, { method: "DELETE" }),
  getMemberInvoices: (id) => request(`/api/members/${id}/invoices`),
// membership plans api
  getPlans: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/plans${query ? `?${query}` : ""}`);
  },
  getPlan: (id) => request(`/api/plans/${id}`),
  createPlan: (payload) => request("/api/plans", { method: "POST", body: JSON.stringify(payload) }),
  updatePlan: (id, payload) => request(`/api/plans/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  togglePlanStatus: (id) => request(`/api/plans/${id}/toggle-status`, { method: "PATCH" }),
  deletePlan: (id) => request(`/api/plans/${id}`, { method: "DELETE" }),
// trainers api
  getTrainers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/trainers${query ? `?${query}` : ""}`);
  },
  getTrainer: (id) => request(`/api/trainers/${id}`),
  createTrainer: (formData) => requestForm("/api/trainers", "POST", formData),
  toggleTrainerStatus: (id) => request(`/api/trainers/${id}/toggle-status`, { method: "PATCH" }),
  deleteTrainer: (id) => request(`/api/trainers/${id}`, { method: "DELETE" }),
  getTrainerMembers: (id) => request(`/api/trainers/${id}/members`),
  updateTrainer: (id, formData) => requestForm(`/api/trainers/${id}`, "PUT", formData),
  getTrainerSalaryPayments: (id) => request(`/api/trainers/${id}/salary-payments`),
  addTrainerSalaryPayment: (id, payload) => request(`/api/trainers/${id}/salary-payments`, { method: "POST", body: JSON.stringify(payload) }),

  // equipmemts api
  getEquipment: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/equipment${query ? `?${query}` : ""}`);
  },
  getEquipmentItem: (id) => request(`/api/equipment/${id}`),
  getEquipmentMaintenance: (id) => request(`/api/equipment/${id}/maintenance`),
  createEquipment: (payload) => request("/api/equipment", { method: "POST", body: JSON.stringify(payload) }),
  updateEquipment: (id, payload) => request(`/api/equipment/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  logMaintenance: (id, payload) => request(`/api/equipment/${id}/maintenance`, { method: "POST", body: JSON.stringify(payload) }),
  deleteEquipment: (id) => request(`/api/equipment/${id}`, { method: "DELETE" }),

  // billing api
  getInvoices: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/invoices${query ? `?${query}` : ""}`);
  },
  getInvoicePayments: (id) => request(`/api/invoices/${id}/payments`),
  addInvoicePayment: (id, payload) => request(`/api/invoices/${id}/payments`, { method: "POST", body: JSON.stringify(payload) }),
  getRevenue: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/revenue${query ? `?${query}` : ""}`);
  },

  // shop 
  getShopProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/shop/products${query ? `?${query}` : ""}`);
  },
  getShopProduct: (id) => request(`/api/shop/products/${id}`),
  createShopProduct: (payload) => request("/api/shop/products", { method: "POST", body: JSON.stringify(payload) }),
  updateShopProduct: (id, payload) => request(`/api/shop/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  restockShopProduct: (id, payload) => request(`/api/shop/products/${id}/restock`, { method: "POST", body: JSON.stringify(payload) }),
  deleteShopProduct: (id) => request(`/api/shop/products/${id}`, { method: "DELETE" }),

  createSale: (payload) => request("/api/sales", { method: "POST", body: JSON.stringify(payload) }),
  getSales: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/sales${query ? `?${query}` : ""}`);
  },
  getNextInvoicePreview: () => request("/api/sales/next-invoice-preview"),
  getSale: (id) => request(`/api/sales/${id}`),
  updateSale: (id, payload) => request(`/api/sales/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
undoSale: (id) => request(`/api/sales/${id}/undo`, { method: "POST" }),
deleteSale: (id) => request(`/api/sales/${id}`, { method: "DELETE" }),

// trails api 
 // trial members (leads)
 getTrials: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/trials${query ? `?${query}` : ""}`);
},
getTrial: (id) => request(`/api/trials/${id}`),
createTrial: (payload) => request("/api/trials", { method: "POST", body: JSON.stringify(payload) }),
updateTrial: (id, payload) => request(`/api/trials/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
updateTrialStatus: (id, payload) => request(`/api/trials/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),
deleteTrial: (id) => request(`/api/trials/${id}`, { method: "DELETE" }),
markTrialConverted: (id, payload) => request(`/api/trials/${id}/mark-converted`, { method: "PATCH", body: JSON.stringify(payload) }),

// staff api
// staff api
getStaffList: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/staff${query ? `?${query}` : ""}`);
},
getStaffMember: (id) => request(`/api/staff/${id}`),
createStaff: (formData) => requestForm("/api/staff", "POST", formData),
updateStaff: (id, formData) => requestForm(`/api/staff/${id}`, "PUT", formData),
toggleStaffStatus: (id) => request(`/api/staff/${id}/toggle-status`, { method: "PATCH" }),
deleteStaff: (id) => request(`/api/staff/${id}`, { method: "DELETE" }),
getStaffSalaryPayments: (id) => request(`/api/staff/${id}/salary-payments`),
addStaffSalaryPayment: (id, payload) => request(`/api/staff/${id}/salary-payments`, { method: "POST", body: JSON.stringify(payload) }),

// expenses api
getExpenses: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/expenses${query ? `?${query}` : ""}`);
},
getExpense: (id) => request(`/api/expenses/${id}`),
createExpense: (payload) => request("/api/expenses", { method: "POST", body: JSON.stringify(payload) }),
updateExpense: (id, payload) => request(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
deleteExpense: (id) => request(`/api/expenses/${id}`, { method: "DELETE" }),
// settings / business info api
getBusinessInfo: () => request("/api/settings/business-info"),
updateBusinessInfo: (formData) => requestForm("/api/settings/business-info", "PUT", formData),
// users / admin panel api
getUsers: () => request("/api/users"),
createUser: (payload) => request("/api/users", { method: "POST", body: JSON.stringify(payload) }),
updateUser: (id, payload) => request(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
deleteUser: (id, payload) => request(`/api/users/${id}`, { method: "DELETE", body: JSON.stringify(payload) }),

// dashboard api
getFinancialOverview: () => request("/api/dashboard/financial"),
getDashboardStats: () => request("/api/dashboard/stats"),
getMembershipTrends: () => request("/api/dashboard/membership-trends"),
getOperationalOverview: () => request("/api/dashboard/operational"),

// reports api
getRevenueReport: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/reports/revenue${query ? `?${query}` : ""}`);
},
getMembershipReport: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/reports/membership${query ? `?${query}` : ""}`);
},
getSalesReport: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/reports/sales${query ? `?${query}` : ""}`);
},
getTrainerReport: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/reports/trainers${query ? `?${query}` : ""}`);
},
getInventoryReport: () => request("/api/reports/inventory"),
getPayrollReport: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/reports/payroll${query ? `?${query}` : ""}`);
},
getExpenseReport: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request(`/api/reports/expenses${query ? `?${query}` : ""}`);
},

};