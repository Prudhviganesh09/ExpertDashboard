import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, User, Loader2 } from "lucide-react";
import { API_ENDPOINTS } from "@/config/api";

interface ZohoLead {
  id: string;
  leadName: string;
  mobile: string;
  email: string;
  leadOwner: string;
  leadStatus: string;
  company: string;
  createdTime: string;
}

interface ZohoLeadsResponse {
  success: boolean;
  count: number;
  leads: ZohoLead[];
}

export default function ZohoLeads() {
  const [searchTerm, setSearchTerm] = useState("");
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const userEmail = userData.email || "";

  const { data, isLoading, error } = useQuery<ZohoLeadsResponse>({
    queryKey: [API_ENDPOINTS.ZOHO_LEADS(userEmail)],
    enabled: !!userEmail,
  });

  const leads: ZohoLead[] = data?.leads || [];
  const filteredLeads = leads.filter((lead) =>
    lead.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.mobile.includes(searchTerm) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">My Leads</h1>
          <Badge variant="outline" className="text-sm">
            {leads.length} {leads.length === 1 ? "Lead" : "Leads"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Leads assigned to you from Zoho CRM
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="input-search-leads"
          placeholder="Search leads by name, mobile, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading leads...</span>
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load leads. Please make sure Zoho credentials are configured.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filteredLeads.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No leads found matching your search"
                  : "No leads assigned to you yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredLeads.map((lead) => (
          <Card
            key={lead.id}
            data-testid={`card-lead-${lead.id}`}
            className="hover:shadow-lg transition-shadow"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg" data-testid={`text-lead-name-${lead.id}`}>
                    {lead.leadName}
                  </CardTitle>
                  {lead.company && (
                    <CardDescription>{lead.company}</CardDescription>
                  )}
                </div>
                {lead.leadStatus && (
                  <Badge variant="secondary" className="text-xs">
                    {lead.leadStatus}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${lead.mobile}`}
                  className="text-primary hover:underline"
                  data-testid={`link-mobile-${lead.id}`}
                >
                  {lead.mobile}
                </a>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-primary hover:underline truncate"
                    data-testid={`link-email-${lead.id}`}
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.createdTime && (
                <div className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(lead.createdTime).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
