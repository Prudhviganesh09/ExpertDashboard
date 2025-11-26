import { useState } from "react";
import { Outlet, useParams, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import ChatBot from "./ChatBot";
import { AlignJustify } from "lucide-react";

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const params = useParams();
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    // Close chat when opening sidebar
    if (!sidebarOpen) {
      setChatOpen(false);
    }
  };

  const toggleChat = (open: boolean) => {
    setChatOpen(open);
  };

  // Get client ID from route params or default to "1"
  const getClientId = () => {
    if (params.id) return params.id;
    if (location.pathname.includes('/clients/')) {
      const pathParts = location.pathname.split('/');
      const clientIdIndex = pathParts.indexOf('clients') + 1;
      if (pathParts[clientIdIndex]) return pathParts[clientIdIndex];
    }
    return "1"; // Default fallback
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Sidebar or Chat (always takes 288px) */}
      <div className="w-72 flex-shrink-0">
        {sidebarOpen && <Sidebar onToggleSidebar={toggleSidebar} />}
        {!sidebarOpen && chatOpen && (
          <ChatBot 
            clientId={getClientId()} 
            sidebarOpen={sidebarOpen} 
            isFullPanel={true}
            onClose={() => setChatOpen(false)}
          />
        )}
        {!sidebarOpen && !chatOpen && (
          <div className="h-full bg-background">
            {/* Hamburger menu in the blank space */}
            <div className="p-4">
              <button
                className="p-2 rounded hover:bg-accent focus:outline-none"
                onClick={toggleSidebar}
                aria-label="Open sidebar"
              >
                <AlignJustify className="h-7 w-7" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Main content - fixed width, never expands */}
      <main className="w-[calc(100vw-288px)] overflow-auto transition-all duration-300">
        {/* Main content area */}
        <div className="h-full p-8">
          <Outlet />
        </div>
      </main>
      
      {/* Floating chatbot button and chat window - only when not in full panel mode */}
      {!(!sidebarOpen && chatOpen) && (
        <ChatBot 
          clientId={getClientId()} 
          sidebarOpen={sidebarOpen} 
          isFullPanel={false}
          onToggleChat={toggleChat}
          chatOpen={chatOpen}
        />
      )}
    </div>
  );
}