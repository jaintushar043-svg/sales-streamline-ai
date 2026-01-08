const integrations = [
  {
    name: "Salesforce",
    logo: "SF",
    color: "from-blue-400 to-blue-600",
  },
  {
    name: "HubSpot",
    logo: "HS",
    color: "from-orange-400 to-orange-600",
  },
  {
    name: "Google Sheets",
    logo: "GS",
    color: "from-green-400 to-green-600",
  },
  {
    name: "Twilio",
    logo: "TW",
    color: "from-red-400 to-red-600",
  },
];

const Integrations = () => {
  return (
    <section id="integrations" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Works With Your Favorite Tools
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Seamless integration with the platforms you already use
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
          {integrations.map((integration, index) => (
            <div 
              key={index}
              className="group flex flex-col items-center gap-3 p-6 bg-card rounded-2xl border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-xl font-bold text-white shadow-lg`}>
                {integration.logo}
              </div>
              <span className="font-medium text-foreground">{integration.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">No CSV upload. No manual mapping.</span>{" "}
            Everything automated.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Integrations;
