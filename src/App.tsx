import { useEffect, useState } from 'react'
import { TabBar, type Tab } from './components/TabBar'
import { Start } from './screens/Start'
import { Cwiczenia, Historia, Plany } from './screens/Placeholders'
import { Settings } from './screens/Settings'
import { useTheme } from './theme'

const TABS: Tab[] = ['start', 'plany', 'historia', 'cwiczenia']

function readTab(): Tab {
  const h = window.location.hash.replace('#', '') as Tab
  return TABS.includes(h) ? h : 'start'
}

export default function App() {
  const { mode, setMode } = useTheme()
  const [tab, setTab] = useState<Tab>(readTab)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Zakładka w adresie (#plany itd.), żeby przycisk Wstecz w Androidzie działał naturalnie.
  useEffect(() => {
    const onHash = () => setTab(readTab())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (t: Tab) => {
    if (t !== tab) window.location.hash = t
  }

  if (settingsOpen) {
    return (
      <div className="mx-auto h-full max-w-[480px]">
        <Settings mode={mode} setMode={setMode} onClose={() => setSettingsOpen(false)} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col">
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {tab === 'start' && <Start onOpenSettings={() => setSettingsOpen(true)} />}
        {tab === 'plany' && <Plany />}
        {tab === 'historia' && <Historia />}
        {tab === 'cwiczenia' && <Cwiczenia />}
      </main>
      <TabBar tab={tab} onChange={go} />
    </div>
  )
}
