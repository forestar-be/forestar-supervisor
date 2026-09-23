import type { NextConfig } from 'next';

const ROBOT_URL = process.env.NEXT_PUBLIC_ROBOT_URL ?? 'https://robot.forestar.be';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // Les liens de signature de devis envoyés par email avant la
        // séparation de forestar-robot pointent encore ici. La query
        // (identifiant et jeton du lien) est conservée par Next.
        source: '/devis/client/signature',
        destination: `${ROBOT_URL}/devis/client/signature`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
