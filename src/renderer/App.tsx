import { CommandDialog } from './CommandDialog';
import { MainHeader } from './MainHeader';
import { Sidebar } from './Sidebar';
import { SidebarResizer } from './SidebarResizer';
import { TerminalArea } from './TerminalArea';
import { TrafficLights } from './TrafficLights';

export function App() {
  return (
    <>
      <TrafficLights />
      <div className="app" id="app">
        <Sidebar />
        <SidebarResizer />
        <main className="main">
          <MainHeader />
          <TerminalArea />
        </main>
      </div>
      <CommandDialog />
    </>
  );
}
