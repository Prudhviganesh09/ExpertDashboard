import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Users, Calendar, BarChart3, 
  Shield, Zap, Globe, Heart, 
  CheckCircle, Star, Award, Target 
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Management",
    description: "Comprehensive client profiles with preferences, history, and communication tracking."
  },
  {
    icon: Building2,
    title: "Property Matching",
    description: "AI-powered property matching based on client preferences and market data."
  },
  {
    icon: Calendar,
    title: "Meeting Scheduler",
    description: "Integrated calendar system for scheduling and managing client appointments."
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Real-time insights into your sales performance and client engagement."
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Enterprise-grade security with full compliance to real estate regulations."
  },
  {
    icon: Zap,
    title: "Automation Tools",
    description: "Automated workflows for follow-ups, document generation, and notifications."
  }
];

const stats = [
  { label: "Active Real Estate Professionals", value: "10,000+", icon: Users },
  { label: "Properties Matched Daily", value: "50,000+", icon: Building2 },
  { label: "Client Satisfaction Rate", value: "98%", icon: Star },
  { label: "Average Deal Closure Time", value: "23 days", icon: Target }
];

const benefits = [
  "Increase client satisfaction with personalized service",
  "Reduce time spent on administrative tasks by 60%",
  "Improve deal closure rates with better client insights",
  "Never miss a follow-up or important client interaction",
  "Access your business from anywhere, anytime",
  "Scale your operations with intelligent automation"
];

export default function About() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-hover">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-foreground">RealEstate Pro</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          The modern real estate professional's complete business management platform
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="outline" className="text-sm">Professional Edition</Badge>
          <Badge variant="outline" className="text-sm">Enterprise Ready</Badge>
          <Badge variant="outline" className="text-sm">AI Powered</Badge>
        </div>
      </div>

      {/* Mission Statement */}
      <Card className="bg-gradient-subtle border-border animate-slide-up">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Our Mission</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            To empower real estate professionals with intelligent tools that streamline client relationships, 
            accelerate property matching, and drive business growth through data-driven insights and automation.
          </p>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label}
            className="text-center hover:shadow-hover transition-all duration-200 animate-slide-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-6">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Features Grid */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Platform Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage your real estate business efficiently and effectively
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card 
              key={feature.title}
              className="hover:shadow-hover transition-all duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-accent" />
              Why Choose RealEstate Pro?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-warning" />
              Industry Recognition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Best Real Estate CRM 2024</span>
                <Badge variant="outline">PropTech Awards</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Innovation in Real Estate</span>
                <Badge variant="outline">TechCrunch</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Top 10 Real Estate Tools</span>
                <Badge variant="outline">Forbes</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-primary text-primary-foreground animate-slide-up">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
            Join thousands of successful real estate professionals who trust RealEstate Pro 
            to manage their client relationships and grow their business.
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" size="lg">
              Schedule Demo
            </Button>
            <Button variant="outline" size="lg" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              <Globe className="h-4 w-4 mr-2" />
              Learn More
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <div className="grid gap-4 md:grid-cols-3 text-center">
        <Card className="animate-slide-up">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Support</h3>
            <p className="text-sm text-muted-foreground">support@realestatepro.com</p>
            <p className="text-sm text-muted-foreground">24/7 Customer Service</p>
          </CardContent>
        </Card>
        
        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Sales</h3>
            <p className="text-sm text-muted-foreground">sales@realestatepro.com</p>
            <p className="text-sm text-muted-foreground">(555) 123-REAL</p>
          </CardContent>
        </Card>
        
        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Partnership</h3>
            <p className="text-sm text-muted-foreground">partners@realestatepro.com</p>
            <p className="text-sm text-muted-foreground">Strategic Alliances</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}