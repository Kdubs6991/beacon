import AdminLayout from './_Layout'
import styles from './Integrations.module.css'

export default function Integrations() {
  return (
    <AdminLayout title="Integrations">
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoWrap}>
            <span className={styles.logoText}>PCO</span>
          </div>
          <div>
            <h2 className={styles.cardTitle}>Planning Center Online</h2>
            <p className={styles.cardDesc}>
              Automatically pull service plans, team members, and positions from Planning Center.
            </p>
          </div>
          <span className={styles.comingSoonBadge}>Coming soon</span>
        </div>

        <div className={styles.comingSoonBody}>
          <p>PCO integration is under active development and will be available in a future update. Once connected, Beacon will be able to:</p>
          <ul className={styles.featureList}>
            <li>Pull your team roster directly from Planning Center plans</li>
            <li>Match team members to automation rules automatically on a schedule</li>
            <li>Sync photos and positions without any manual entry</li>
          </ul>
          <p className={styles.comingSoonNote}>
            In the meantime, use <strong>Manual service types</strong> on the Services page to define your team and push assignments to your display screens.
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
