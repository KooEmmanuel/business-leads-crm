import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Mail, Phone, MapPin, User, ExternalLink, Building2, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Business {
  id: number;
  name: string;
  phone: string;
  email: string;
  location: string;
  contact: string;
  website: string;
  category: string;
  size: string;
}

export default function Home() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/businesses.json')
      .then(res => res.json())
      .then(data => {
        setBusinesses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading businesses:', err);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    businesses.forEach(b => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats).sort();
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(business => {
      const matchesSearch = 
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.contact.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || business.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [businesses, searchTerm, categoryFilter]);

  const stats = useMemo(() => {
    return {
      total: businesses.length,
      withEmail: businesses.filter(b => b.email).length,
      withPhone: businesses.filter(b => b.phone).length,
      categories: categories.length
    };
  }, [businesses, categories]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-border bg-card">
        <div className="container py-8">
          <div className="flex items-center gap-4 mb-2">
            <Building2 className="w-10 h-10 text-primary" strokeWidth={2.5} />
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
              Business Leads
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            AI Booking System Opportunities - 100 Qualified Leads
          </p>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b-4 border-border bg-secondary/50">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="brutalist-card bg-card p-4">
              <div className="text-3xl font-display font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">Total Leads</div>
            </div>
            <div className="brutalist-card bg-card p-4">
              <div className="text-3xl font-display font-bold text-accent">{stats.withEmail}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">With Email</div>
            </div>
            <div className="brutalist-card bg-card p-4">
              <div className="text-3xl font-display font-bold text-primary">{stats.withPhone}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">With Phone</div>
            </div>
            <div className="brutalist-card bg-card p-4">
              <div className="text-3xl font-display font-bold text-accent">{stats.categories}</div>
              <div className="text-sm text-muted-foreground uppercase tracking-wide">Categories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Sidebar Filters */}
          <aside className="space-y-6">
            <Card className="border-4 border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block uppercase tracking-wide">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Name, location, category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-2 border-border bg-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block uppercase tracking-wide">
                    Category
                  </label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="border-2 border-border bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(searchTerm || categoryFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("all");
                    }}
                    className="w-full border-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}

                <div className="pt-4 border-t-2 border-border">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="text-primary font-bold">{filteredBusinesses.length}</span> of {businesses.length} businesses
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-4 border-border bg-card">
              <CardContent className="pt-6">
                <h3 className="font-display font-bold text-lg mb-3">About This Directory</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Curated list of small businesses across salons, barber shops, medical spas, and beauty services that could benefit from AI-integrated booking systems.
                </p>
              </CardContent>
            </Card>
          </aside>

          {/* Business Grid */}
          <div>
            {loading ? (
              <div className="text-center py-20">
                <div className="text-muted-foreground">Loading businesses...</div>
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-2xl font-display font-bold mb-2">No Results Found</div>
                <div className="text-muted-foreground">Try adjusting your filters</div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredBusinesses.map((business, index) => (
                  <Card
                    key={business.id}
                    className="brutalist-card bg-card hover:bg-card/80 transition-colors"
                    style={{
                      animationDelay: `${(index % 10) * 50}ms`,
                      animation: 'fadeInUp 0.4s ease-out forwards',
                      opacity: 0
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-xl font-display leading-tight">
                          {business.name}
                        </CardTitle>
                        <Badge variant="secondary" className="shrink-0 border-2 border-border">
                          #{business.id}
                        </Badge>
                      </div>
                      {business.category && (
                        <Badge className="w-fit bg-primary/20 text-primary border-2 border-primary/30 hover:bg-primary/30">
                          {business.category}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {business.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-primary shrink-0" />
                          <a
                            href={`tel:${business.phone}`}
                            className="font-mono text-foreground hover:text-primary transition-colors"
                          >
                            {business.phone}
                          </a>
                        </div>
                      )}
                      
                      {business.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-4 h-4 text-accent shrink-0" />
                          <a
                            href={`mailto:${business.email}`}
                            className="font-mono text-foreground hover:text-accent transition-colors truncate"
                          >
                            {business.email}
                          </a>
                        </div>
                      )}
                      
                      {business.location && (
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{business.location}</span>
                        </div>
                      )}
                      
                      {business.contact && (
                        <div className="flex items-center gap-3 text-sm">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{business.contact}</span>
                        </div>
                      )}
                      
                      {business.website && (
                        <div className="pt-2">
                          <a
                            href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Visit Website
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
