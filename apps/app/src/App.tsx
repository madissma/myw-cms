import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Tech from './pages/Tech'
import Media from './pages/Media'
import NewsDetail from './pages/NewsDetail'
import Voice from './pages/Voice'
import Mall from './pages/Mall'
import Contact from './pages/Contact'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = hash.replace('#', '')
    // 区块数据是异步拉回的，锚点可能要等页面装修数据到位才存在，
    // 故轮询到出现为止（上限 2s），否则 /about#intro 这类深链会落空。
    let tries = 0
    const timer = setInterval(() => {
      tries += 1
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        clearInterval(timer)
      } else if (tries >= 30) {
        clearInterval(timer)
      }
    }, 60)
    return () => clearInterval(timer)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <div className="min-h-screen bg-cream">
      <ScrollManager />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/tech" element={<Tech />} />
          <Route path="/media" element={<Media />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="/voice" element={<Voice />} />
          <Route path="/mall" element={<Mall />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
