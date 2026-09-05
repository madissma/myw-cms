import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Reveal from '../components/Reveal'
import { itemText, toItems, type BlockComponentProps } from './types'

/**
 * 首屏轮播：现网 Home 的第一屏，标题按空格断行、第二段染金。
 * 轮播项的按钮逐条存（primaryUrl / secondaryUrl），后台可给每张图配不同去向。
 */
export default function HeroSlider({ block }: BlockComponentProps) {
  const slides = toItems(block.props.slides)
  const total = slides.length
  const interval = Number(block.props.interval) > 0 ? Number(block.props.interval) : 6000
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (total <= 1) return
    const timer = setInterval(() => setCurrent((v) => (v + 1) % total), interval)
    return () => clearInterval(timer)
  }, [total, interval])

  if (!total) return null
  const index = current < total ? current : 0
  const slide = slides[index]
  const go = (dir: number) => setCurrent((v) => (v + dir + total) % total)
  const parts = itemText(slide, 'title').split(' ')

  return (
    <section className="relative h-screen min-h-[640px] overflow-hidden bg-forest-deep">
      {slides.map((item, i) => {
        const image = itemText(item, 'image')
        const title = itemText(item, 'title')
        return (
          <div
            key={image || i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
          >
            {image && <img src={image} alt={title} className={`h-full w-full object-cover ${i === index ? 'kenburns' : ''}`} />}
          </div>
        )
      })}

      {/* caption */}
      <div className="relative mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
        <div className="max-w-3xl pb-16">
          <Reveal key={index}>
            <div className="gold-rule text-sm tracking-[0.45em] text-gold-light">
              <span>{itemText(slide, 'eyebrow')}</span>
            </div>
            <h1 className="mt-6 font-serif-sc text-5xl font-semibold leading-tight tracking-wider text-cream lg:text-7xl">
              {parts.map((part, idx) => (
                <span key={idx} className={idx > 0 ? 'text-gold-light' : ''}>
                  {idx > 0 && <br />}
                  {part}
                </span>
              ))}
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-8 text-cream/80 lg:text-base">{itemText(slide, 'text')}</p>
          </Reveal>
          <Reveal delay={150}>
            <div className="mt-10 flex flex-wrap gap-4">
              {itemText(slide, 'primary') && (
                <Link
                  to={itemText(slide, 'primaryUrl') || '/about'}
                  className="group inline-flex items-center gap-2 bg-gold px-8 py-3.5 text-sm tracking-widest text-forest transition-colors hover:bg-gold-light"
                >
                  {itemText(slide, 'primary')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              {itemText(slide, 'secondary') && (
                <Link
                  to={itemText(slide, 'secondaryUrl') || '/mall'}
                  className="inline-flex items-center border border-cream/40 px-8 py-3.5 text-sm tracking-widest text-cream transition-colors hover:border-gold hover:text-gold-light"
                >
                  {itemText(slide, 'secondary')}
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {/* carousel controls */}
      {total > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="上一张"
            className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full border border-cream/30 p-2.5 text-cream/80 transition-colors hover:border-gold hover:text-gold-light"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="下一张"
            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-cream/30 p-2.5 text-cream/80 transition-colors hover:border-gold hover:text-gold-light"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`切换到第${i + 1}张`}
                className={`h-1 transition-all duration-500 ${i === index ? 'w-8 bg-gold' : 'w-4 bg-cream/40 hover:bg-cream/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
