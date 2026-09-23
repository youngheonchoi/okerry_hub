import { useMemo, useState } from 'react'
import catalog from './data/tools.json'
import './App.css'

type ViewMode = 'grid' | 'rows'
type Tool = (typeof catalog.tools)[number]
const allCategory = { id: 'all', name: '전체', order: 0, visible: true }

function SearchIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="m12 12 4 4" /></svg>
}

function GridIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>
}

function RowsIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" /></svg>
}

function ExternalLinkIcon() {
  return <svg className="uh-tile__go" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-label="외부 링크"><path d="M5 11 11 5M6 5h5v5" /></svg>
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return /^https?:$/.test(url.protocol)
  } catch {
    return false
  }
}

function App() {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState(catalog.ui.defaultCategoryId)
  const [view, setView] = useState<ViewMode>(() => {
    const stored = window.localStorage.getItem('uh.view')
    return stored === 'rows' ? 'rows' : catalog.ui.defaultView as ViewMode
  })

  const categories = useMemo(() => [allCategory, ...catalog.categories.filter((category) => category.visible).sort((a, b) => a.order - b.order)], [])
  const categoryMap = useMemo(() => new Map(catalog.categories.map((category) => [category.id, category])), [])
  const badgeMap = useMemo(() => new Map(catalog.badges.map((badge) => [badge.id, badge])), [])
  const tools = useMemo(() => catalog.tools.filter((tool) => tool.visible), [])

  const visibleTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return tools
      .filter((tool) => categoryId === 'all' || tool.categoryId === categoryId)
      .filter((tool) => {
        if (!normalizedQuery) return true
        const category = categoryMap.get(tool.categoryId)
        return [tool.name, tool.description, category?.name].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
      })
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ko'))
  }, [categoryId, categoryMap, query, tools])

  const setViewMode = (nextView: ViewMode) => {
    setView(nextView)
    window.localStorage.setItem('uh.view', nextView)
  }

  const groupedTools = useMemo(() => {
    const groups = new Map<string, Tool[]>()
    visibleTools.forEach((tool) => groups.set(tool.categoryId, [...(groups.get(tool.categoryId) ?? []), tool]))
    return [...groups.entries()].sort((a, b) => (categoryMap.get(a[0])?.order ?? 0) - (categoryMap.get(b[0])?.order ?? 0))
  }, [categoryMap, visibleTools])

  return (
    <div className="uh-page">
      <div className="uh-wrap">
        <header className="uh-top">
          <div className="uh-brand">
            <h1>{catalog.app.title}</h1>
            <p>{catalog.app.description} <span className="uh-count">· {tools.length}개 도구</span></p>
          </div>
          <label className="uh-search">
            <SearchIcon />
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="도구 이름이나 설명으로 찾기" aria-label="유틸리티 검색" />
            <span className="uh-kbd" aria-hidden="true">/</span>
          </label>
        </header>

        <div className="uh-bar">
          <div className="uh-tabs" role="tablist" aria-label="카테고리">
            {categories.map((category) => (
              <button key={category.id} className="uh-tab" type="button" role="tab" aria-selected={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
                {category.name}
                <span className="uh-tab-count">{category.id === 'all' ? tools.length : tools.filter((tool) => tool.categoryId === category.id).length}</span>
              </button>
            ))}
          </div>
          <div className="uh-tools" role="group" aria-label="보기 방식">
            <button className="uh-view-button" type="button" aria-pressed={view === 'grid'} aria-label="카드로 보기" onClick={() => setViewMode('grid')}><GridIcon /></button>
            <button className="uh-view-button" type="button" aria-pressed={view === 'rows'} aria-label="목록으로 보기" onClick={() => setViewMode('rows')}><RowsIcon /></button>
          </div>
        </div>

        <main className="uh-main" aria-live="polite">
          {!visibleTools.length ? (
            <div className="uh-empty"><strong>검색 결과가 없습니다</strong><span>다른 단어로 검색하거나 전체 탭을 확인하세요.</span></div>
          ) : categoryId === 'all' && !query.trim() ? (
            groupedTools.map(([groupId, groupTools]) => <ToolSection key={groupId} title={categoryMap.get(groupId)?.name ?? '기타'} tools={groupTools} view={view} badgeMap={badgeMap} />)
          ) : (
            <ToolSection title={query.trim() ? '검색 결과' : categoryMap.get(categoryId)?.name ?? '기타'} tools={visibleTools} view={view} badgeMap={badgeMap} />
          )}
        </main>
      </div>
    </div>
  )
}

function ToolSection({ title, tools, view, badgeMap }: { title: string; tools: Tool[]; view: ViewMode; badgeMap: Map<string, (typeof catalog.badges)[number]> }) {
  return <section className="uh-section"><div className="uh-section-heading"><h2>{title}</h2><span>{tools.length}개</span></div><div className={`uh-list ${view === 'rows' ? 'is-rows' : ''}`}>{tools.map((tool) => <ToolTile key={tool.id} tool={tool} badgeMap={badgeMap} />)}</div></section>
}

function ToolTile({ tool, badgeMap }: { tool: Tool; badgeMap: Map<string, (typeof catalog.badges)[number]> }) {
  const url = isHttpUrl(tool.url)
  const badge = badgeMap.get(tool.badgeId) ?? badgeMap.get(url ? 'open' : 'closed')
  const content = <><span className="uh-tile-glyph">{tool.glyph || tool.name.slice(0, 1)}</span><span className="uh-tile-body"><span className="uh-tile-name">{tool.name}</span><span className="uh-tile-desc">{tool.description}</span><span className="uh-tile-meta">{badge && <span className={`uh-tag ${badge.className}`}>{badge.label}</span>}</span></span>{url && <ExternalLinkIcon />}</>

  return url ? <a className="uh-tile" href={tool.url} target="_blank" rel="noreferrer">{content}</a> : <div className="uh-tile uh-tile--nolink">{content}</div>
}

export default App
