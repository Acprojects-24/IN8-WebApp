import React from 'react';
import { motion } from 'framer-motion';
import { 
  Server, AlertTriangle, CheckCircle, Activity, 
  Wifi, WifiOff, Users
} from 'lucide-react';

const StatusIndicator = ({ failing, endpoints }) => {
  if (failing > 0) {
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-red-400" />
        <span className="text-xs text-red-300">ICE Failing</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <CheckCircle size={14} className="text-green-400" />
      <span className="text-xs text-green-300">Healthy</span>
    </div>
  );
};

const BridgeRow = ({ bridge, index }) => (
  <motion.tr
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors duration-200"
  >
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <Server size={14} className="text-blue-400" />
        </div>
        <div>
          <div className="text-sm font-medium text-white truncate max-w-[120px]">
            {bridge.jvb}
          </div>
          <div className="text-xs text-slate-400">
            JVB Instance
          </div>
        </div>
      </div>
    </td>
    
    <td className="px-4 py-3 text-center">
      <div className="flex flex-col items-center">
        {bridge.endpoints !== undefined ? (
          <>
            <div className="text-lg font-bold text-blue-400">{bridge.endpoints}</div>
            <div className="text-xs text-slate-400">endpoints</div>
          </>
        ) : (
          <div className="text-sm text-slate-500">-</div>
        )}
      </div>
    </td>
    
    <td className="px-4 py-3">
      <StatusIndicator failing={bridge.iceFailing} endpoints={bridge.endpoints} />
    </td>
    
    <td className="px-4 py-3 text-center">
      <div className="flex justify-center">
        {bridge.iceFailing > 0 ? (
          <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <WifiOff size={12} className="text-red-400" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <Wifi size={12} className="text-green-400" />
          </div>
        )}
      </div>
    </td>
  </motion.tr>
);

const BridgesTable = React.memo(function BridgesTable({ bridges, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700/50 rounded-lg w-1/3 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-700/50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bridges || bridges.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-500/10 rounded-2xl flex items-center justify-center">
          <Server size={24} className="text-slate-400" />
        </div>
        <p className="text-slate-400 font-medium">No Bridge Data Available</p>
        <p className="text-xs text-slate-500 mt-1">Bridge metrics not detected</p>
      </motion.div>
    );
  }

  const healthyBridges = bridges.filter(b => b.iceFailing === 0).length;
  const failingBridges = bridges.filter(b => b.iceFailing > 0).length;
  const totalEndpoints = bridges.reduce((sum, b) => sum + (b.endpoints || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border-b border-slate-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <Server size={20} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bridge Details</h3>
              <p className="text-sm text-slate-400">JVB instances and status</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-white font-semibold">
              {bridges.length} Bridge{bridges.length !== 1 ? 's' : ''}
            </div>
            <div className="text-slate-400">
              {totalEndpoints} total endpoints
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm text-green-300">{healthyBridges} Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm text-red-300">{failingBridges} Failing</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-700/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Bridge
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                Endpoints
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                Connection
              </th>
            </tr>
          </thead>
          <tbody>
            {bridges.map((bridge, index) => (
              <BridgeRow key={bridge.jvb} bridge={bridge} index={index} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      {bridges.length > 5 && (
        <div className="bg-slate-900/30 border-t border-slate-700/30 p-4 text-center text-xs text-slate-400">
          Showing {Math.min(bridges.length, 10)} of {bridges.length} bridges
        </div>
      )}
    </motion.div>
  );
});

export default BridgesTable;
