import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { skeleton: 'home' }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { skeleton: 'dashboard' }
    },
    {
      path: '/editor/:id?',
      name: 'editor',
      component: () => import('@/views/EditorView.vue'),
      meta: { skeleton: 'editor' }
    },
    {
      path: '/templates/:id',
      name: 'templates',
      component: () => import('@/views/TemplatesView.vue'),
      meta: { skeleton: 'templates' }
    }
  ]
})

export default router
