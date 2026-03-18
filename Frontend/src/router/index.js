import { createRouter, createWebHistory } from 'vue-router'

const AuthView = () => import('../views/AuthView.vue')

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'Login',
    component: AuthView,
    props: { mode: 'login' },
  },
  {
    path: '/register',
    name: 'Register',
    component: AuthView,
    props: { mode: 'register' },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/room/:name',
    name: 'Room',
    component: () => import('../views/RoomView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/share/:code',
    name: 'ShareResolve',
    component: () => import('../views/ShareResolveView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) return { name: 'Login' }
  if ((to.name === 'Login' || to.name === 'Register') && token) return { name: 'Home' }
})

export default router
