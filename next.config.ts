import type { NextConfig } from 'next';

const ROBOT_URL = process.env.NEXT_PUBLIC_ROBOT_URL ?? 'https://robot.forestar.be';

/**
 * En développement, Next refuse ses ressources internes (`/_next/hmr`…) à une
 * origine autre que `localhost` : ouverte depuis un autre PC du réseau, par
 * `http://192.168.x.y:3000`, la page reste blanche. L'hôte de l'API locale est
 * celui de la machine qui sert aussi l'atelier : on l'autorise. Sans effet en
 * production.
 */
function lanDevOrigins(): string[] {
  try {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_API_URL ?? '');
    return hostname && hostname !== 'localhost' ? [hostname] : [];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),
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
