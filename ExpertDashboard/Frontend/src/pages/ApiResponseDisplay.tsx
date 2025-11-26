import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Building2, Bed, Bath, Ruler } from "lucide-react";

const apiResponseData = {
  "id": "917331111835",
  "name": " Deepthi",
  "email": "",
  "phone": "917331111835",
  "location": "Miyapur",
  "status": "Active",
  "priority": "High",
  "preferences": {
    "type": "Apartment",
    "budget": "7000000",
    "location": "Miyapur",
    "timeline": "Not specified",
    "configuration": "2BHK"
  },
  "budget": "7000000",
  "possession_date": "Not specified",
  "configuration": "2BHK",
  "property_type": "Apartment",
  "matchedProperties": [
    {
      "id": "p2",
      "title": "Developer Name: NIKHILSAI KRISHNA INFRA LLP",
      "address": "Miyapur",
      "price": "₹71.82–89.46 Lakhs",
      "bedrooms": 2,
      "bathrooms": 2,
      "sqft": "1,140–1,420 sq ft",
      "status": "Active",
      "match": 90,
      "image": "/api/placeholder/300/200",
      "reraId": "P02400003215",
      "mongodbId": "68c94d4f001071923c6031af",
      "developer": "NIKHILSAI KRISHNA INFRA LLP*",
      "possession": "Ready to Move",
      "configuration": "2BHK & 3BHK"
    },
    {
      "id": "p3",
      "title": "Developer Name: Aspire Spaces Private Limited",
      "address": "Miyapur",
      "price": "₹81.06–89.10 Lakhs",
      "bedrooms": 2,
      "bathrooms": 2,
      "sqft": "1,210–1,330 sq ft",
      "status": "Active",
      "match": 85,
      "image": "/api/placeholder/300/200",
      "reraId": "P01100002844",
      "mongodbId": "68c94d4f001071923c602f4c",
      "developer": "Aspire Spaces Private Limited*",
      "possession": "Ready (12-01-2024)",
      "configuration": "2BHK"
    }
  ]
};

export default function ApiResponseDisplay() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-client-name">
            {apiResponseData.name}
          </h1>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground" data-testid="text-location">{apiResponseData.location}</span>
            <Badge variant="default" data-testid="badge-status">{apiResponseData.status}</Badge>
            <Badge variant="destructive" data-testid="badge-priority">{apiResponseData.priority} Priority</Badge>
          </div>
        </div>

        {/* Client Information */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium" data-testid="text-phone">{apiResponseData.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium" data-testid="text-email">{apiResponseData.email || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Configuration</p>
                <p className="font-medium" data-testid="text-configuration">{apiResponseData.preferences.configuration}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Property Type</p>
                <p className="font-medium" data-testid="text-property-type">{apiResponseData.preferences.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium" data-testid="text-pref-location">{apiResponseData.preferences.location}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget & Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-medium" data-testid="text-budget">₹{(parseInt(apiResponseData.budget) / 10000000).toFixed(2)} Cr</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Possession</p>
                <p className="font-medium" data-testid="text-possession">{apiResponseData.possession_date}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Matched Properties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Matched Properties</CardTitle>
              <Badge variant="secondary" data-testid="text-match-count">
                {apiResponseData.matchedProperties.length} Properties
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {apiResponseData.matchedProperties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No matched properties available</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {apiResponseData.matchedProperties.map((property) => (
                  <Card 
                    key={property.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200"
                    data-testid={`card-property-${property.id}`}
                  >
                    <div className="relative">
                      <div className="h-48 bg-muted rounded-t-lg flex items-center justify-center">
                        <Home className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <Badge 
                        variant="default"
                        className="absolute top-2 right-2"
                        data-testid={`badge-match-${property.id}`}
                      >
                        {property.match}% match
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-1" data-testid={`text-title-${property.id}`}>
                        {property.title}
                      </h3>
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span data-testid={`text-address-${property.id}`}>{property.address}</span>
                      </div>
                      <p className="text-2xl font-bold text-primary mb-3" data-testid={`text-price-${property.id}`}>
                        {property.price}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                        <div className="flex items-center">
                          <Bed className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span data-testid={`text-bedrooms-${property.id}`}>{property.bedrooms} BHK</span>
                        </div>
                        <div className="flex items-center">
                          <Bath className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span data-testid={`text-bathrooms-${property.id}`}>{property.bathrooms}</span>
                        </div>
                        <div className="flex items-center">
                          <Ruler className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span data-testid={`text-sqft-${property.id}`}>{property.sqft}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Developer:</span>
                          <span className="font-medium" data-testid={`text-developer-${property.id}`}>{property.developer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Possession:</span>
                          <span className="font-medium" data-testid={`text-possession-${property.id}`}>{property.possession}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RERA ID:</span>
                          <span className="font-mono text-xs" data-testid={`text-rera-${property.id}`}>{property.reraId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Configuration:</span>
                          <span className="font-medium" data-testid={`text-config-${property.id}`}>{property.configuration}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Raw API Response */}
        <Card>
          <CardHeader>
            <CardTitle>Raw API Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs" data-testid="code-api-response">
              {JSON.stringify(apiResponseData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
