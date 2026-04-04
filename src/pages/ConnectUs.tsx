import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, Building, User } from "lucide-react";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ConnectUs = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([23.7104, 90.4074], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Fix default marker icon
    const defaultIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    L.marker([23.7104, 90.4074], { icon: defaultIcon })
      .addTo(map)
      .bindPopup("Bangladesh Development Bank PLC")
      .openPopup();

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="container py-8">
      <h1 className="font-heading text-3xl font-bold text-foreground mb-8">Connect Us</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Sohel Rana</p>
                <p className="text-muted-foreground">Senior Officer</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Building className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Bangladesh Development Bank PLC</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 flex-shrink-0">
                <Phone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile</p>
                <a
                  href="tel:+8801515637222"
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  01515637222
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 flex-shrink-0">
                <Mail className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a
                  href="mailto:s.rana135@gmail.com"
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  s.rana135@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold text-foreground">Chapainawabganj, Bangladesh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shadow overflow-hidden">
          <CardHeader>
            <CardTitle className="font-heading">Our Location</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapRef} className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectUs;
