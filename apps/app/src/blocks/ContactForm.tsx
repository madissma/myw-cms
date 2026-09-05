import { useState, type FormEvent } from 'react'
import { RotateCcw, Send } from 'lucide-react'
import { submitMessage } from '../api/messages'
import Reveal from '../components/Reveal'
import { useSite } from '../store/site'
import { itemText, toTextList } from './types'
import type { BlockComponentProps } from './types'

const INPUT =
  'mt-2 w-full border border-forest/20 bg-cream/50 px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:border-gold focus:outline-none'

/**
 * 在线留言表单：提交打 POST /public/messages，成功后展示后台可配的回复文案。
 * 隐藏字段 website 为蜜罐（后端据此丢弃机器人提交），真人不可见。
 */
export default function ContactForm({ block }: BlockComponentProps) {
  const { setting } = useSite()
  const [form, setForm] = useState({ name: '', phone: '', email: '', type: '', content: '', website: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [tip, setTip] = useState('')

  const title = itemText(block.props, 'title') || block.title || ''
  const desc = itemText(block.props, 'text', 'description')
  const typeOptions = toTextList(block.props.typeOptions)
  const showType = block.props.showTypeSelect === true && typeOptions.length > 0
  const successTitle = itemText(block.props, 'successTitle')
  const successTip = itemText(block.props, 'successTip')
  const successHotline = itemText(block.props, 'successHotline')
  const hotline = setting(itemText(block.props, 'phoneKey') || 'contact.consumerHotline', '')
  const againText = itemText(block.props, 'againText')
  const field = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (state === 'sending') return
    setState('sending')
    try {
      const result = await submitMessage({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        type: form.type || undefined,
        content: form.content.trim(),
        website: form.website,
      })
      // 服务端回的提示与区块里的 successTip 同源（都来自 form.successTip），重复展示会多出一行
      const serverTip = result?.tip || setting('form.successTip', '')
      setTip(serverTip === successTip ? '' : serverTip)
      setState('done')
    } catch (err) {
      // 后端限流 / 校验失败都要把原因显示回表单，不能静默变成功态
      setTip(err instanceof Error && err.message ? err.message : '提交失败，请稍后再试')
      setState('error')
    }
  }

  const reset = () => {
    setForm({ name: '', phone: '', email: '', type: '', content: '', website: '' })
    setTip('')
    setState('idle')
  }

  return (
    <Reveal delay={150}>
      <div className="border border-forest/10 bg-white p-8 lg:p-10">
        {title && (
          <h2 className="gold-rule font-serif-sc text-2xl tracking-widest text-forest">
            <span>{title}</span>
          </h2>
        )}
        {desc && <p className="mt-4 text-sm text-ink-soft">{desc}</p>}

        {state === 'done' ? (
          <div className="mt-10 border border-gold/40 bg-gold/5 p-10 text-center">
            <p className="font-serif-sc text-2xl tracking-widest text-forest">{successTitle}</p>
            <p className="mt-4 text-sm leading-7 text-ink-soft">
              {successTip}
              {successHotline && (
                <>
                  <br />
                  {successHotline} {hotline}。
                </>
              )}
              {tip && (
                <>
                  <br />
                  {tip}
                </>
              )}
            </p>
            <button
              onClick={reset}
              className="mt-8 inline-flex items-center gap-2 border border-forest px-8 py-3 text-sm tracking-widest text-forest transition-colors hover:bg-forest hover:text-cream"
            >
              <RotateCcw className="h-4 w-4" />
              {againText}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm tracking-wider text-ink">
                  {itemText(block.props, 'nameLabel')} <span className="text-gold">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={field('name')}
                  placeholder={itemText(block.props, 'namePlaceholder')}
                  className={INPUT}
                />
              </div>
              <div>
                <label className="text-sm tracking-wider text-ink">
                  {itemText(block.props, 'phoneLabel')} <span className="text-gold">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={field('phone')}
                  placeholder={itemText(block.props, 'phonePlaceholder')}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className="text-sm tracking-wider text-ink">{itemText(block.props, 'emailLabel')}</label>
              <input
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder={itemText(block.props, 'emailPlaceholder')}
                className={INPUT}
              />
            </div>
            {showType && (
              <div>
                <label className="text-sm tracking-wider text-ink">
                  {itemText(block.props, 'typeLabel') || '咨询类型'}
                </label>
                <select value={form.type} onChange={field('type')} className={INPUT}>
                  <option value="">请选择</option>
                  {typeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-sm tracking-wider text-ink">
                {itemText(block.props, 'contentLabel')} <span className="text-gold">*</span>
              </label>
              <textarea
                required
                rows={6}
                value={form.content}
                onChange={field('content')}
                placeholder={itemText(block.props, 'contentPlaceholder')}
                className={`${INPUT} resize-none`}
              />
            </div>
            {/* 蜜罐：视觉上不可见，机器人填了就会被后端丢弃 */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={field('website')}
              autoComplete="off"
              tabIndex={-1}
              aria-hidden
              className="hidden"
            />
            {state === 'error' && <p className="text-sm text-gold">{tip}</p>}
            <button
              type="submit"
              disabled={state === 'sending'}
              className="inline-flex items-center gap-2 bg-forest px-10 py-4 text-sm tracking-widest text-cream transition-colors hover:bg-forest-light disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {state === 'sending' ? '提交中…' : itemText(block.props, 'submitText')}
            </button>
          </form>
        )}
      </div>
    </Reveal>
  )
}
