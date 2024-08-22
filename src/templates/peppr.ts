import { pepprModule } from "peppr";
// cfg loads your peppr configuration from package.json
import cfg from "./package.json";

// Hellopeppr is a demo capability that is included with peppr. Comment or delete the line below to remove it.
import { Hellopeppr } from "./capabilities/hello-peppr";

/**
 * This is the main entrypoint for this peppr module. It is run when the module is started.
 * This is where you register your peppr configurations and capabilities.
 */
new pepprModule(cfg, [
  // "Hellopeppr" is a demo capability that is included with peppr. Comment or delete the line below to remove it.
  Hellopeppr,

  // Your additional capabilities go here
]);
