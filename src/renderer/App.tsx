import { CommandDialog } from './CommandDialog';
import { MainHeader } from './MainHeader';
import { Sidebar } from './Sidebar';
import { SidebarResizer } from './SidebarResizer';
import { TerminalArea } from './TerminalArea';

export function App() {
  return (
    <>
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
