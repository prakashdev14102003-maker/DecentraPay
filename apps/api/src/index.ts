import app from "./app.js";
import { config } from "./config.js";

app.listen(config.port, () => {
    console.log(`🚀 DecentraPay API running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
});
