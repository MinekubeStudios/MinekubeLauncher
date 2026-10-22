import { createRouter, createWebHistory } from 'vue-router'
/**
 * Loads each page when its route is visited.
 */
export default new createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			name: 'Home',
			component: () => import('@/pages/Index.vue'),
		},
		{
			path: '/browse/:projectType',
			name: 'Discover content',
			component: () => import('@/pages/Browse.vue'),
		},
		{
			path: '/skins',
			name: 'Skin selector',
			component: () => import('@/pages/Skins.vue'),
		},
		{
			path: '/screenshots',
			name: 'Screenshots',
			component: () => import('@/pages/Screenshots.vue'),
		},
		{
			path: '/:projectType(mod|plugin|datapack|resourcepack|shader|modpack)/:id/:rest(.*)*',
			redirect: (to) => {
				const rest = to.params.rest ? `/${[].concat(to.params.rest).join('/')}` : ''
				return `/project/${to.params.id}${rest}${to.hash}`
			},
		},
		{
			path: '/project/:id',
			name: 'Project',
			component: () => import('@/pages/project/Index.vue'),
			props: true,
			children: [
				{
					path: '',
					name: 'Description',
					component: () => import('@/pages/project/Description.vue'),
				},
				{
					path: 'versions',
					name: 'Versions',
					component: () => import('@/pages/project/Versions.vue'),
				},
				{
					path: 'version/:version',
					name: 'Version',
					component: () => import('@/pages/project/Version.vue'),
					props: true,
				},
				{
					path: 'gallery',
					name: 'Gallery',
					component: () => import('@/pages/project/Gallery.vue'),
				},
			],
		},
		{
			path: '/instance/:id',
			name: 'Instance',
			component: () => import('@/pages/instance/layout.vue'),
			children: [
				{
					path: '',
					name: 'InstanceRemoved',
					redirect: { name: 'Home' },
				},
				{
					path: 'edit',
					name: 'InstanceEdit',
					component: () => import('@/pages/instance/editor/index.vue'),
				},
				{
					path: ':rest(.*)*',
					name: 'InstanceNotFound',
					redirect: { name: 'Home' },
				},
			],
		},
	],
	linkActiveClass: 'router-link-active',
	linkExactActiveClass: 'router-link-exact-active',
	scrollBehavior(to, from) {
		if (to.path === from.path || to.name === 'Home') return
		// Sometimes Vue's scroll behavior is not working as expected, so we need to manually scroll to top (especially on Linux)
		document.querySelector('.app-viewport')?.scrollTo(0, 0)
		return {
			el: '.app-viewport',
			top: 0,
		}
	},
})
