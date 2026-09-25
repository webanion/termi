import { CommandDialog } from './CommandDialog';
import { CommandPalette } from './CommandPalette';
import { GuideDialog } from './GuideDialog';
import { MainHeader } from './MainHeader';
import { ShortcutSheet } from './ShortcutSheet';
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
      <GuideDialog />
      <ShortcutSheet />
      <CommandPalette />
    </>
  );
}
