import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    },
    {
      path: '/editor/:id?',
      name: 'editor',
      component: () => import('@/views/EditorView.vue')
    },
    {
      path: '/templates/:id',
      name: 'templates',
      component: () => import('@/views/TemplatesView.vue')
    }
  ]
})

export default router