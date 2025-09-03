import React from 'react';
import { motion } from 'framer-motion';
import { 
  Video, Users, Radio, Server, Activity, 
  AlertTriangle, CheckCircle, XCircle, 
  Clock, Zap, Shield, TrendingUp
} from 'lucide-react';

const MetricCard = ({ title, children, gradient, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40 backdrop-blur-xl border border-slate-700/50 p-6 shadow-2xl ${className}`}
  >
    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradient}`} />
    <div className="relative z-10">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        {title}
      </h3>
      {children}
    </div>
    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-2xl" />
  </motion.div>
);

const StatusChip = ({ label, value, color = "blue", size = "sm" }) => {
  const sizeClasses = size === "lg" ? "px-4 py-2 text-base" : "px-3 py-1 text-sm";
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    red: "bg-red-500/20 text-red-300 border-red-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    gray: "bg-slate-500/20 text-slate-300 border-slate-500/30"
  };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border backdrop-blur-sm ${sizeClasses} ${colorClasses[color] || colorClasses.blue}`}>
      <span className="font-semibold">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
};

const MetricValue = ({ value, label, icon: Icon, color = "text-white" }) => (
  <div className="flex items-center gap-3">
    {Icon && <Icon size={20} className={`${color} opacity-80`} />}
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {label && <div className="text-sm text-slate-400">{label}</div>}
    </div>
  </div>
);

const MetricsCards = React.memo(function MetricsCards({ data, loading, error, lastUpdated }) {
  // Development mode indicator
  const isDev = process.env.NODE_ENV === 'development';
  
  if (error) {
    return (
      <div className="col-span-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center"
        >
          <AlertTriangle className="mx-auto mb-3 text-red-400" size={32} />
          <h3 className="text-lg font-semibold text-red-300 mb-2">Metrics Unavailable</h3>
          <p className="text-red-200/80 text-sm mb-4">{error}</p>
          <p className="text-xs text-slate-400">
            Failed to connect to Prometheus at http://207.38.43.45:9090
          </p>
          {isDev && (
            <p className="text-xs text-yellow-400 mt-2">
              💡 In development: Check console for mock data usage
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <>
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative overflow-hidden rounded-2xl bg-slate-800/40 border border-slate-700/50 p-6"
          >
            <div className="animate-pulse">
              <div className="h-4 bg-slate-700/50 rounded-lg w-1/3 mb-4" />
              <div className="h-8 bg-slate-700/50 rounded-lg w-2/3 mb-2" />
              <div className="h-3 bg-slate-700/50 rounded-lg w-1/2" />
            </div>
            <div className="absolute top-2 right-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            </div>
          </motion.div>
        ))}
      </>
    );
  }

  return (
    <>
      {/* Active Meetings Card */}
      <MetricCard
        title={
          <>
            <Video size={18} className="text-blue-400" />
            Active Meetings
          </>
        }
        gradient="from-blue-500 to-cyan-500"
      >
        <div className="space-y-4">
          <MetricValue
            value={data.conferences}
            icon={Video}
            color="text-blue-400"
          />
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400">
              Largest: <span className="text-white font-semibold">{data.largestConference}</span>
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              Pairs: <span className="text-white font-semibold">{data.pairs}</span>
            </span>
          </div>
        </div>
      </MetricCard>

      {/* Participants Card */}
      <MetricCard
        title={
          <>
            <Users size={18} className="text-green-400" />
            Participants
          </>
        }
        gradient="from-green-500 to-emerald-500"
      >
        <div className="space-y-4">
          <MetricValue
            value={data.participants}
            icon={Users}
            color="text-green-400"
          />
          <div className="text-xs text-slate-400">
            ICE failures (total): <span className="text-red-300 font-semibold">{data.health.xmppDisconnects}</span>
          </div>
        </div>
      </MetricCard>

      {/* Jibri Status Card */}
      <MetricCard
        title={
          <>
            <Radio size={18} className="text-purple-400" />
            Jibri Status
          </>
        }
        gradient="from-purple-500 to-pink-500"
      >
        <div className="space-y-4">
          {/* Main status chips */}
          <div className="flex flex-wrap gap-2">
            <StatusChip label="Connected" value={data.jibri.connected} color="blue" />
            <StatusChip label="Available" value={data.jibri.available} color="green" />
            <StatusChip label="Busy" value={data.jibri.busy} color="yellow" />
            <StatusChip label="Idle" value={data.jibri.idle} color="gray" />
          </div>
          
          {/* Active services */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center">
              <div className="text-lg font-bold text-red-400">{data.jibri.recActive}</div>
              <div className="text-slate-400">Recording</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{data.jibri.streamActive}</div>
              <div className="text-slate-400">Streaming</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{data.jibri.sipActive}</div>
              <div className="text-slate-400">SIP</div>
            </div>
          </div>

          {/* Failures */}
          <div className="pt-3 border-t border-slate-700/50 text-xs">
            <div className="text-slate-400 mb-2">Total Failures:</div>
            <div className="flex justify-between">
              <span className="text-red-300">Rec: {data.jibri.failures.recording}</span>
              <span className="text-blue-300">Stream: {data.jibri.failures.streaming}</span>
              <span className="text-green-300">SIP: {data.jibri.failures.sip}</span>
            </div>
          </div>
        </div>
      </MetricCard>

      {/* Bridges Card */}
      <MetricCard
        title={
          <>
            <Server size={18} className="text-orange-400" />
            Bridges (JVB)
          </>
        }
        gradient="from-orange-500 to-red-500"
      >
        <div className="space-y-4">
          {/* Bridge status overview */}
          <div className="flex flex-wrap gap-2">
            <StatusChip label="Total" value={data.bridges.total} color="blue" />
            <StatusChip label="Operational" value={data.bridges.operational} color="green" />
            <StatusChip label="Shutdown" value={data.bridges.inShutdown} color="red" />
          </div>

          {/* Health percentage */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-400">Health</span>
                <span className="text-sm font-bold text-green-400">{data.bridges.healthyPct.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(data.bridges.healthyPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bridge items preview */}
          {data.bridges.items.length > 0 && (
            <div className="text-xs">
              <div className="text-slate-400 mb-2">
                {data.bridges.items.length} bridge{data.bridges.items.length !== 1 ? 's' : ''} detected
              </div>
              <div className="max-h-16 overflow-y-auto space-y-1">
                {data.bridges.items.slice(0, 3).map((bridge) => (
                  <div key={bridge.jvb} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate">{bridge.jvb}</span>
                    <div className="flex items-center gap-2">
                      {bridge.endpoints !== undefined && (
                        <span className="text-blue-300">{bridge.endpoints}ep</span>
                      )}
                      {bridge.iceFailing > 0 && (
                        <AlertTriangle size={12} className="text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
                {data.bridges.items.length > 3 && (
                  <div className="text-slate-500 text-center">+{data.bridges.items.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>
      </MetricCard>

      {/* Control Plane / Health Card */}
      <MetricCard
        title={
          <>
            <Activity size={18} className="text-cyan-400" />
            Control Plane
          </>
        }
        gradient="from-cyan-500 to-blue-500"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-cyan-400">{data.health.threads}</div>
              <div className="text-xs text-slate-400">Threads</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">{data.health.xmppDisconnects}</div>
              <div className="text-xs text-slate-400">XMPP Disc.</div>
            </div>
          </div>

          {data.health.version && (
            <div className="pt-3 border-t border-slate-700/50">
              <div className="text-xs text-slate-400 mb-1">Version:</div>
              <div className="text-sm font-mono text-slate-200 bg-slate-800/50 rounded px-2 py-1 truncate">
                {data.health.version}
              </div>
            </div>
          )}

          {lastUpdated && (
            <div className="pt-3 border-t border-slate-700/50 text-xs text-slate-500">
              <Clock size={12} className="inline mr-1" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {isDev && (
            <div className="pt-2 text-xs text-yellow-400/60">
              🧪 Development mode
            </div>
          )}
        </div>
      </MetricCard>
    </>
  );
});

export default MetricsCards;
