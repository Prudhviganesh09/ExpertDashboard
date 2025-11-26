import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  BarChart3,
  TrendingUp,
  UserCheck,
  ArrowLeft,
  Shield,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/config/api";

interface AgentStats {
  id: string;
  name: string;
  email: string;
  clientCount: number;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  lastContact: string;
  preferences: {
    property_type: string;
    budget: string;
    possession_date: string;
    configuration: string;
  };
}

export default function AgentAnalytics() {
  const [agentStats, setAgentStats] = useState<AgentStats[]>([]);
  const [agentClients, setAgentClients] = useState<Record<string, Client[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is admin
  const isAdmin = () => {
    const userData = localStorage.getItem('userData');
    if (!userData) return false;
    
    try {
      const user = JSON.parse(userData);
      return user.email === "admin@example.com";
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!isAdmin()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/clients");
      return;
    }

    fetchAgentStats();
  }, [navigate, toast]);

  const fetchAgentStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(API_ENDPOINTS.AGENTS_STATS);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAgentStats(data.agents || []);
          // Fetch clients for each agent
          await fetchAgentClients(data.agents || []);
        }
      } else {
        throw new Error('Failed to fetch agent statistics');
      }
    } catch (error) {
      console.error('Error fetching agent statistics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agent statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgentClients = async (agents: AgentStats[]) => {
    const clientsMap: Record<string, Client[]> = {};
    
    for (const agent of agents) {
      try {
        const response = await fetch(API_ENDPOINTS.AGENT_CLIENTS(agent.id));
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Transform client data to match our interface
            const transformedClients = data.clients.map((apiClient: any) => ({
              id: apiClient.mobile,
              name: apiClient.lastname || apiClient.leadname || "N/A",
              email: apiClient.email || "N/A",
              phone: apiClient.mobile,
              location: "Unknown Location", // Default location
              lastContact: apiClient.modifiedTime,
              preferences: {
                property_type: apiClient.property_type || "Not specified",
                budget: apiClient.budget || "Not specified",
                possession_date: apiClient.possession_date || "Not specified",
                configuration: apiClient.configuration || "Not specified",
              },
            }));
            clientsMap[agent.id] = transformedClients;
          }
        }
      } catch (error) {
        console.error(`Error fetching clients for agent ${agent.name}:`, error);
        clientsMap[agent.id] = [];
      }
    }
    
    setAgentClients(clientsMap);
  };

  const getTotalAssignments = () => {
    return agentStats.reduce((sum, agent) => sum + agent.clientCount, 0);
  };

  const getAveragePerAgent = () => {
    return agentStats.length > 0 ? Math.round(getTotalAssignments() / agentStats.length) : 0;
  };

  const getMaxClients = () => {
    return Math.max(...agentStats.map(agent => agent.clientCount), 0);
  };

  const getTopPerformer = () => {
    return agentStats.length > 0 ? agentStats[0] : null;
  };

  const getMinClients = () => {
    return Math.min(...agentStats.map(agent => agent.clientCount), 0);
  };

  const getLoadVariance = () => {
    const max = getMaxClients();
    const min = getMinClients();
    return max - min;
  };

  const getUnassignedAgents = () => {
    return agentStats.filter(agent => agent.clientCount === 0);
  };

  const getOverloadedAgents = () => {
    const average = getAveragePerAgent();
    const threshold = Math.max(average * 1.5, 3); // Overloaded if 1.5x average or 3+ clients
    return agentStats.filter(agent => agent.clientCount >= threshold);
  };

  const getBalancedAgents = () => {
    const average = getAveragePerAgent();
    const threshold = Math.max(average * 1.5, 3);
    return agentStats.filter(agent => agent.clientCount > 0 && agent.clientCount < threshold);
  };

  const getWorkloadDistributionStatus = () => {
    const variance = getLoadVariance();
    const unassigned = getUnassignedAgents().length;
    const overloaded = getOverloadedAgents().length;
    
    if (variance === 0 && unassigned === 0) return "excellent";
    if (variance <= 1 && overloaded === 0) return "good";
    if (variance <= 2 && overloaded <= 1) return "fair";
    return "poor";
  };

  const getCapacityAnalysis = () => {
    const totalAgents = agentStats.length;
    const totalClients = getTotalAssignments();
    const idealClientsPerAgent = 3; // Assuming 3 clients per agent is optimal
    const idealCapacity = totalAgents * idealClientsPerAgent;
    const utilizationRate = totalClients / idealCapacity;
    
    return {
      totalCapacity: idealCapacity,
      currentUtilization: totalClients,
      utilizationRate: utilizationRate,
      availableCapacity: idealCapacity - totalClients
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading agent analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin-clients")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agent Analytics</h1>
            <p className="text-muted-foreground">Comprehensive agent performance insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Admin Access</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {agentStats.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {getTotalAssignments()}
                </p>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {getAveragePerAgent()}
                </p>
                <p className="text-sm text-muted-foreground">Avg per Agent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {getMaxClients()}
                </p>
                <p className="text-sm text-muted-foreground">Max Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performer Highlight */}
      {getTopPerformer() && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-2 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
                  🏆 Top Performer: {getTopPerformer()?.name}
                </h3>
                <p className="text-muted-foreground">
                  Leading with {getTopPerformer()?.clientCount} clients assigned
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>📧 {getTopPerformer()?.email}</span>
                  <span>📅 Joined: {new Date(getTopPerformer()?.createdAt || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Details Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-foreground">Agent Performance Details</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agentStats.map((agent) => (
            <Card 
              key={agent.id} 
              className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
                selectedAgent === agent.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {agent.email}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Assigned Clients</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {agent.clientCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((agent.clientCount / Math.max(...agentStats.map(a => a.clientCount), 1)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined: {new Date(agent.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Expandable Client List */}
                {selectedAgent === agent.id && agentClients[agent.id] && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-2">Assigned Clients:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {agentClients[agent.id].length > 0 ? (
                        agentClients[agent.id].map((client) => (
                          <div key={client.id} className="text-xs bg-muted/50 p-2 rounded">
                            <div className="font-medium">{client.name}</div>
                            <div className="text-muted-foreground">
                              📧 {client.email} • 📱 {client.phone}
                            </div>
                            <div className="text-muted-foreground">
                              🏠 {client.preferences.property_type} • 💰 {client.preferences.budget}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No clients assigned
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Performance Insights */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Dynamic analysis and recommendations for optimal agent workload distribution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workload Distribution Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                📊 Workload Distribution
                <Badge 
                  variant={getWorkloadDistributionStatus() === "excellent" ? "default" : 
                          getWorkloadDistributionStatus() === "good" ? "secondary" : 
                          getWorkloadDistributionStatus() === "fair" ? "outline" : "destructive"}
                  className="text-xs"
                >
                  {getWorkloadDistributionStatus()}
                </Badge>
              </h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Highest load: <span className="font-medium">{getMaxClients()} clients</span></p>
                <p>• Lowest load: <span className="font-medium">{getMinClients()} clients</span></p>
                <p>• Average load: <span className="font-medium">{getAveragePerAgent()} clients</span></p>
                <p>• Load variance: <span className="font-medium">{getLoadVariance()} clients</span></p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">👥 Agent Categories</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Balanced agents: <span className="font-medium text-green-600">{getBalancedAgents().length}</span></p>
                <p>• Overloaded agents: <span className="font-medium text-orange-600">{getOverloadedAgents().length}</span></p>
                <p>• Unassigned agents: <span className="font-medium text-blue-600">{getUnassignedAgents().length}</span></p>
                <p>• Total active: <span className="font-medium">{agentStats.filter(a => a.clientCount > 0).length}</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">⚡ Capacity Analysis</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                {(() => {
                  const capacity = getCapacityAnalysis();
                  return (
                    <>
                      <p>• Current utilization: <span className="font-medium">{capacity.currentUtilization}/{capacity.totalCapacity}</span></p>
                      <p>• Utilization rate: <span className="font-medium">{(capacity.utilizationRate * 100).toFixed(1)}%</span></p>
                      <p>• Available capacity: <span className="font-medium text-blue-600">{capacity.availableCapacity} clients</span></p>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(capacity.utilizationRate * 100, 100)}%` }}
                        ></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Dynamic Recommendations */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">🎯 Smart Recommendations</h4>
            <div className="space-y-2">
              {(() => {
                const recommendations = [];
                const overloaded = getOverloadedAgents();
                const unassigned = getUnassignedAgents();
                const variance = getLoadVariance();
                const capacity = getCapacityAnalysis();

                // Redistribution recommendations
                if (overloaded.length > 0 && unassigned.length > 0) {
                  recommendations.push(
                    <p key="redistribute" className="text-orange-600 text-sm">
                      ⚠️ <strong>Urgent:</strong> {overloaded.length} agent(s) overloaded while {unassigned.length} agent(s) have no clients. Consider redistributing workload.
                    </p>
                  );
                } else if (variance > 2) {
                  recommendations.push(
                    <p key="balance" className="text-yellow-600 text-sm">
                      ⚖️ <strong>Balance needed:</strong> High workload variance ({variance} clients). Consider redistributing for better balance.
                    </p>
                  );
                }

                // Capacity recommendations
                if (capacity.utilizationRate < 0.5) {
                  recommendations.push(
                    <p key="underutilized" className="text-blue-600 text-sm">
                      💡 <strong>Growth opportunity:</strong> Team is only {(capacity.utilizationRate * 100).toFixed(1)}% utilized. Can handle {capacity.availableCapacity} more clients.
                    </p>
                  );
                } else if (capacity.utilizationRate > 0.9) {
                  recommendations.push(
                    <p key="nearCapacity" className="text-red-600 text-sm">
                      🚨 <strong>Near capacity:</strong> Team is {(capacity.utilizationRate * 100).toFixed(1)}% utilized. Consider adding more agents.
                    </p>
                  );
                }

                // Performance recognition
                if (variance <= 1 && unassigned.length === 0 && overloaded.length === 0) {
                  recommendations.push(
                    <p key="excellent" className="text-green-600 text-sm">
                      ✅ <strong>Excellent distribution:</strong> Workload is well balanced across all agents. Great job!
                    </p>
                  );
                }

                // Specific agent recommendations
                if (overloaded.length > 0) {
                  recommendations.push(
                    <p key="specific" className="text-gray-600 text-sm">
                      📋 <strong>Action items:</strong> Consider reassigning 1-2 clients from {overloaded.map(a => a.name).join(", ")} to available agents.
                    </p>
                  );
                }

                return recommendations.length > 0 ? recommendations : (
                  <p className="text-muted-foreground text-sm">No specific recommendations at this time. Monitor workload as client base grows.</p>
                );
              })()}
            </div>
          </div>

          {/* Quick Actions */}
          {(getOverloadedAgents().length > 0 || getUnassignedAgents().length > 0) && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-sm mb-2">🚀 Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/admin-clients")}
                  className="text-xs"
                >
                  Reassign Clients
                </Button>
                {getUnassignedAgents().length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {getUnassignedAgents().length} agent(s) available
                  </Badge>
                )}
                {getOverloadedAgents().length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {getOverloadedAgents().length} agent(s) overloaded
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
