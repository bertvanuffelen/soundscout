/**
 * Praatplaat Clustering Utility
 *
 * Clusters nearby submissions on a praatplaat image into visual spots.
 * Shared between PraatplaatViewer (teacher) and SharedPraatplaatViewer (public).
 */

export interface ClusterableSubmission {
  position_x: number;
  position_y: number;
}

export interface SpotCluster<T extends ClusterableSubmission> {
  x: number;
  y: number;
  submissions: T[];
}

const CLUSTER_THRESHOLD = 0.05; // 5% van de afbeelding

/**
 * Groepeer submissions die dicht bij elkaar liggen (< 5% afstand) in clusters.
 * Centroïde wordt herberekend bij elke toevoeging.
 */
export function clusterSubmissions<T extends ClusterableSubmission>(
  submissions: T[]
): SpotCluster<T>[] {
  const clusters: SpotCluster<T>[] = [];

  for (const sub of submissions) {
    const nearbyCluster = clusters.find(
      (c) =>
        Math.abs(c.x - sub.position_x) < CLUSTER_THRESHOLD &&
        Math.abs(c.y - sub.position_y) < CLUSTER_THRESHOLD
    );

    if (nearbyCluster) {
      nearbyCluster.submissions.push(sub);
      // Herbereken centroïde
      const total = nearbyCluster.submissions.length;
      nearbyCluster.x =
        nearbyCluster.submissions.reduce((sum, s) => sum + s.position_x, 0) / total;
      nearbyCluster.y =
        nearbyCluster.submissions.reduce((sum, s) => sum + s.position_y, 0) / total;
    } else {
      clusters.push({
        x: sub.position_x,
        y: sub.position_y,
        submissions: [sub],
      });
    }
  }

  return clusters;
}
