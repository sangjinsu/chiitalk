import type { NextConfig } from 'next';
import { withBotId } from 'botid/next/config';
const nextConfig: NextConfig = { poweredByHeader: false, reactStrictMode: true };
export default withBotId(nextConfig);
