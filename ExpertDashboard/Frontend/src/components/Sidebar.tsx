import { NavLink, useNavigate } from "react-router-dom";
import { Users, Calendar, Info, Building2, LogOut, Shield, UserCheck, BarChart3, ClipboardList, Briefcase, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlignJustify } from "lucide-react";
import { useState, useEffect } from "react";
import { API_ENDPOINTS } from "@/config/api";


const navigationItems = [
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
    description: "Manage client relationships"
  },
  {
    name: "Expert Dashboard",
    href: "/expert-dashboard",
    icon: Briefcase,
    description: "Manage requirements and properties"
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    description: "Schedule and track meetings"
  },
  {
    name: "About",
    href: "/about",
    icon: Info,
    description: "Platform information"
  }
];

const preSaleNavigationItems = [
  {
    name: "Pre-Sale Dashboard",
    href: "/pre-sale-dashboard",
    icon: ClipboardList,
    description: "Manage leads and requirements"
  }
];

const adminNavigationItems = [
  {
    name: "Admin Dashboard",
    href: "/admin-clients",
    icon: Shield,
    description: "Manage client assignments"
  },
  {
    name: "Agent Analytics",
    href: "/agent-analytics",
    icon: BarChart3,
    description: "View agent performance insights"
  },
  {
    name: "Expert Dashboard",
    href: "/expert-dashboard",
    icon: Briefcase,
    description: "Manage requirements and properties"
  }
];

export function Sidebar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [clientCount, setClientCount] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [leads, setLeads] = useState([]);

  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const checkUserStatus = async () => {
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const isAdminUser = user.email === "admin@example.com";
          setIsAdmin(isAdminUser);
          setAgentName(user.username || "");
          setIsAgent(!isAdminUser);
          setUserEmail(user.email || "");

          // If user is an agent, fetch their client count
          if (!isAdminUser && user.id) {
            setLoading(true);
            try {
              // Check if this is a Zoho/Pre-Sale user
              const preSaleEmails = [
                "vaishnavig@relai.world",
                "angaleenaj@relai.world",
                "angelinak@relai.world",
                "subscriptions@relai.world",
                "sindhua@relai.world",
                "sindhu@relai.world",
              ];
              const isZohoUser = preSaleEmails.includes(user.email);

              if (isZohoUser) {
                // Fetch Zoho leads count
                const response = await fetch(API_ENDPOINTS.ZOHO_LEADS(user.email));
                if (response.ok) {
                  const result = await response.json();
                  console.log('📧 Zoho Leads API Response:', result);
                  if (result.success && result.leads) {
                    console.log('📧 Total leads fetched:', result.leads.length);
                    console.log('📧 Sample lead data:', result.leads[0]);
                    console.log('📧 Emails in leads:', result.leads.map((l: any) => ({ name: l.leadName, email: l.email })));
                    setClientCount(result.leads.length);
                    setLeads(result.leads);
                  }
                } else {
                  console.error('❌ Failed to fetch Zoho leads:', response.status, response.statusText);
                  const errorData = await response.json().catch(() => ({}));
                  console.error('❌ Error details:', errorData);
                }
              } else {
                // Use agent stats for regular users
                const response = await fetch(API_ENDPOINTS.AGENT_STATS(user.id));
                if (response.ok) {
                  const data = await response.json();
                  if (data.success) {
                    setClientCount(data.clientCount);
                  }
                }
              }
            } catch (error) {
              console.error('Error fetching agent stats:', error);
            } finally {
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          setIsAdmin(false);
          setIsAgent(false);
        }
      }
    };

    checkUserStatus();
  }, []);

  const handleLogout = () => {
    // Clear all user-specific data from localStorage
    localStorage.removeItem('userData');
    localStorage.removeItem('cachedClients');
    localStorage.removeItem('clientAgentAssignments');

    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    navigate("/signin");
  };

  // Check if current user should see lavender theme
  const preSaleEmails = [
    "vaishnavig@relai.world",
    "angaleenaj@relai.world",
    "angelinak@relai.world",
    "subscriptions@relai.world",
    "sindhua@relai.world",
    "sindhu@relai.world",
  ];
  const isPreSaleUser = preSaleEmails.includes(userEmail);

  return (
    <div className={`flex h-screen w-72 flex-col bg-gradient-subtle border-r border-border shadow-card ${isPreSaleUser ? 'lavender-theme' : ''}`}>
      {/* Logo at Top Left */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
        <div className="flex h-16 w-16 items-center justify-center bg-white overflow-hidden rounded-lg">
          <img src="/relaiLogo.png" alt="Relai Logo" className="h-16 w-16 object-contain" />
        </div>
        <button
          className="p-2 rounded hover:bg-accent focus:outline-none"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <AlignJustify className="h-7 w-7" />
        </button>
      </div>

      {/* Agent Statistics Section */}
      {isAgent && (
        <div className="px-4 py-4 border-b border-border">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Agent: {agentName}</h3>
                <p className="text-xs text-muted-foreground">Your client portfolio</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Assigned Clients</span>
                  {loading ? (
                    <div className="h-3 w-6 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {clientCount}
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((clientCount / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {isAdmin ? (
          // Admin sees only admin navigation
          adminNavigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-hover"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className={cn(
                      "text-xs opacity-75",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground group-hover:text-accent-foreground/80"
                    )}>
                      {item.description}
                    </span>
                  </div>
                </>
              )}
            </NavLink>
          ))
        ) : isPreSaleUser ? (
          // Pre-sale users see only pre-sale dashboard
          preSaleNavigationItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-hover"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className={cn(
                      "text-xs opacity-75",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground group-hover:text-accent-foreground/80"
                    )}>
                      {item.description}
                    </span>
                  </div>
                </>
              )}
            </NavLink>
          ))
        ) : (
          // Regular users see normal navigation
          navigationItems
            .filter(item => {
              // Hide Calendar and About for specific users
              const restrictedEmails = [
                "vaishnavig@relai.world",
                "angelinak@relai.world",
                "subscriptions@relai.world",
                "sindhua@relai.world",
                "sindhu@relai.world",
              ];
              const isRestrictedUser = restrictedEmails.includes(userEmail);

              if (isRestrictedUser && (item.name === "Calendar" || item.name === "About")) {
                return false;
              }
              return true;
            })
            .map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-hover"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{item.name}</span>
                      <span className={cn(
                        "text-xs opacity-75",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground group-hover:text-accent-foreground/80"
                      )}>
                        {item.description}
                      </span>
                    </div>
                  </>
                )}
              </NavLink>
            ))
        )}
      </nav>

      {/* Zoho Leads List in Sidebar */}
      {isPreSaleUser && (
        <div className="flex-1 overflow-y-auto px-4 py-2 border-t border-border">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            My Leads ({clientCount})
          </h3>
          <div className="space-y-3">
            {leads.map((lead: any) => {
              // Force console log for every lead
              console.log('🔍 LEAD:', lead.leadName, 'EMAIL:', lead.email, 'HAS EMAIL:', !!lead.email);

              return (
                <div key={lead.id} className="p-2 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors">
                  <div className="font-medium text-sm truncate" title={lead.leadName}>
                    {lead.leadName}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="truncate">{lead.mobile}</span>
                  </div>
                  {/* ALWAYS show email line - for debugging */}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 text-blue-500" />
                    <span className="truncate text-blue-600 font-semibold" title={lead.email || 'No email in data'}>
                      {lead.email ? lead.email : 'NO EMAIL'}
                    </span>
                  </div>
                </div>
              );
            })}
            {leads.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No leads assigned
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-3">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Button>

        {/* <div className="rounded-lg bg-accent/10 p-3"> */}
        {/* <p className="text-xs font-medium text-accent">Professional Edition</p>
          <p className="text-xs text-muted-foreground mt-1">
            Advanced real estate management tools
          </p> */}
        {/* </div> */}
      </div>
    </div>
  );
}