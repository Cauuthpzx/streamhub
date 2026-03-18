import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import AppTooltip from './components/AppTooltip.vue'
import SvgIcon from './components/SvgIcon.vue'
const app = createApp(App)
app.use(router)
app.use(i18n)
app.component('AppTooltip', AppTooltip)
app.component('SvgIcon', SvgIcon)
app.mount('#app')
