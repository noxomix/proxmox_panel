export const routes = [
  {
    path: "/",
    redirect: "/dashboard",
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("./views/Login.vue"),
    meta: { requiresGuest: true },
  },
  {
    path: "/",
    component: () => import("./layouts/AppLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("./views/Dashboard.vue"),
        meta: { title: "Dashboard" },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("./views/Profile.vue"),
        meta: { 
          title: "Profile Settings",
          subtitle: "Manage your account settings and API keys"
        },
      },
      {
        path: "users",
        name: "Users",
        component: () => import("./views/Users.vue"),
        meta: { 
          title: "User Management",
          subtitle: "Manage user accounts and permissions"
        },
      },
      {
        path: "roles",
        name: "Roles",
        component: () => import("./views/Roles.vue"),
        meta: { 
          title: "Role Management",
          subtitle: "Manage user roles and permissions"
        },
      },
      {
        path: "namespaces",
        name: "Namespaces",
        component: () => import("./views/Namespaces.vue"),
        meta: { 
          title: "Namespace Management",
          subtitle: "Manage hierarchical namespace structure"
        },
      },
    ],
  },
];
