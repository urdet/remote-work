import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Monitor, 
  Activity, 
  Clock, 
  ChevronRight, 
  X, 
  ExternalLink, 
  Wifi, 
  Briefcase,
  Search,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Terminal
} from 'lucide-react';

// --- Mock Data ---
const INITIAL_EMPLOYEES = [
  { id: 1, name: "Lucas Bernard", role: "Frontend Dev", status: "active", task: "Fixing UI Bugs", joined: "08:30 AM", performance: 92 },
  { id: 2, name: "Sarah Connor", role: "UI Designer", status: "active", task: "Landing Page Mockup", joined: "09:15 AM", performance: 98 },
  { id: 3, name: "Marc Dupont", role: "Backend Eng", status: "away", task: "Database Migration", joined: "08:00 AM", performance: 85 },
  { id: 4, name: "Julie Gomez", role: "Product Manager", status: "active", task: "Sprint Planning", joined: "10:00 AM", performance: 95 },
  { id: 5, name: "Kevin Smith", role: "QA Tester", status: "offline", task: "N/A", joined: "N/A", performance: 0 },
];

const App = () => {
  const [employees] = useState(INITIAL_EMPLOYEES);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [streamStatus, setStreamStatus] = useState("Connecting...");

  // Simulate WebSocket Screen Stream Logic
  useEffect(() => {
    if (isLive) {
      setStreamStatus("Establishing WebSocket...");
      const timer = setTimeout(() => setStreamStatus("Streaming @ 60fps"), 1500);
      return () => clearTimeout(timer);
    } else {
      setStreamStatus("Disconnected");
      // Note: We don't automatically close fullscreen here unless the stream is killed
      if (!isLive) setIsFullScreen(false);
    }
  }, [isLive]);

  // FIX: Separate closing the side panel from closing the fullscreen view
  const closeSidePanel = () => {
    // If we are in fullscreen, we keep the employee selected so the big screen stays visible
    // but we can hide the side panel logic if needed. 
    // However, usually "close" on the panel means "stop everything" unless in fullscreen.
    if (!isFullScreen) {
      setSelectedEmployee(null);
      setIsLive(false);
    }
    // If fullscreen is active, we just "unselect" for the UI drawer, 
    // but the Big Screen Modal will still have access to the state if we handle it carefully.
    // For this UI pattern, we'll ensure closeDetails only triggers if NOT in big screen.
  };

  const closeAll = () => {
    setSelectedEmployee(null);
    setIsLive(false);
    setIsFullScreen(false);
  };

  const toggleFullScreen = (e) => {
    e.stopPropagation();
    if (isLive) setIsFullScreen(!isFullScreen);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-x-hidden">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-200">
            <Monitor className="text-white w-5 h-5" />
          </div>
          <h1 className="text-sm font-bold tracking-tight uppercase text-slate-700">WorkWatch <span className="text-orange-500">Pro</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search employee..." 
              className="pl-9 pr-4 py-1.5 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 rounded-full text-xs transition-all w-64 outline-none"
            />
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300"></div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Current Workforce</h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium font-mono">Real-time status monitoring</p>
          </div>
          <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-[11px] font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
            <Activity className="w-3 h-3 text-orange-500" /> EXPORT REPORT
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Task</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    onClick={() => {
                        setSelectedEmployee(emp);
                        setIsFullScreen(false); // Reset FS if switching users
                    }}
                    className="hover:bg-orange-50/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{emp.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">#{emp.id}0234</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">{emp.role}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                        emp.status === 'away' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          emp.status === 'active' ? 'bg-emerald-500' : 
                          emp.status === 'away' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 italic">
                      {emp.task}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 rounded-md hover:bg-orange-100 text-slate-400 group-hover:text-orange-600 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Side Detail Panel (Drawer) - Only visible if an employee is selected AND NOT in full screen */}
      {selectedEmployee && !isFullScreen && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20" onClick={closeAll} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-30 transform transition-transform animate-in slide-in-from-right duration-300">
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-orange-50/50">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-orange-500" /> Employee Profile
                </h3>
                <button onClick={closeAll} className="p-1 hover:bg-white rounded-md text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-orange-200">
                    {selectedEmployee.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{selectedEmployee.name}</h4>
                    <p className="text-[11px] text-slate-500">{selectedEmployee.role}</p>
                    <div className="mt-1.5 flex gap-2">
                       <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 flex items-center gap-1 font-medium">
                         <Clock className="w-3 h-3" /> In: {selectedEmployee.joined}
                       </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Efficiency</p>
                      <p className="text-base font-bold text-slate-800">{selectedEmployee.performance}%</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Active Time</p>
                      <p className="text-base font-bold text-slate-800">4h 12m</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Activity</h5>
                    <div className="p-4 border border-orange-100 bg-orange-50/40 rounded-xl">
                      <div className="flex items-center gap-2 mb-2 text-orange-700">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold tracking-tight">{selectedEmployee.task}</span>
                      </div>
                      <div className="w-full bg-orange-200 h-1 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full w-2/3 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* WebSocket Screen View Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Monitor className="w-3 h-3" /> Screen Monitoring
                      </h5>
                      {isLive && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[9px] font-bold text-red-500 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> LIVE
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 group cursor-default shadow-inner">
                      {isLive ? (
                        <>
                          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-500 via-transparent to-transparent"></div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-3"></div>
                            <p className="text-[10px] text-slate-400 font-mono uppercase">{streamStatus}</p>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={toggleFullScreen}
                              className="p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded text-white transition-colors"
                              title="Expand to big screen"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-3 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                             <span className="text-[9px] text-slate-500 font-mono">192.168.1.{selectedEmployee.id}:8080</span>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50">
                          <ShieldAlert className="w-6 h-6 text-slate-700 mb-2" />
                          <p className="text-[10px] text-slate-500 font-medium tracking-tight">Monitoring Offline</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setIsLive(!isLive)}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        isLive 
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' 
                        : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200/50'
                      }`}
                    >
                      {isLive ? <><X className="w-3.5 h-3.5" /> STOP MONITORING</> : <><Wifi className="w-3.5 h-3.5" /> START LIVE STREAM</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* BIG SCREEN MONITORING MODE (Full Screen Modal) */}
      {/* Logic: Always show if isFullScreen is true, regardless of side panel visibility */}
      {isFullScreen && selectedEmployee && (
        <div className="fixed inset-0 bg-black z- flex flex-col animate-in fade-in duration-300">
          {/* Header Bar */}
          <div className="px-6 py-4 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-500 rounded flex items-center justify-center font-bold text-white">
                {selectedEmployee.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-white text-sm font-bold flex items-center gap-2">
                  {selectedEmployee.name} <span className="text-zinc-500 text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded tracking-tighter uppercase tracking-widest">Employee_ID_{selectedEmployee.id}</span>
                </h3>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 animate-pulse">
                    <Wifi className="w-3 h-3" /> LIVE STREAMING
                  </span>
                  <span className="text-zinc-500 text-[10px] border-l border-zinc-700 pl-3 uppercase">Task: {selectedEmployee.task}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-md border border-zinc-700">
                <Terminal className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[10px] font-mono text-zinc-400">WS_STATUS: {streamStatus}</span>
              </div>
              <button 
                onClick={() => setIsFullScreen(false)}
                className="flex items-center gap-2 px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-bold transition-colors"
              >
                <Minimize2 className="w-4 h-4" /> EXIT FULLSCREEN
              </button>
            </div>
          </div>

          {/* Main Visual Content */}
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ff5500 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>
            
            <div className="relative w-full max-w-6xl aspect-video bg-zinc-950 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800 overflow-hidden flex flex-col items-center justify-center group shadow-orange-500/5">
              <div className="absolute top-0 left-0 p-4 font-mono text-[10px] text-emerald-500/40 pointer-events-none hidden lg:block">
                SYS_MONITOR_ACTIVE: v2.4.0 <br/>
                ENCRYPTION: AES-256 <br/>
                RELAY: SECURE_CHANNEL_8 <br/>
                IP: 10.0.0.{selectedEmployee.id}
              </div>

              <div className="z-10 text-center">
                <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-6"></div>
                <p className="text-xs font-bold text-zinc-400 tracking-[0.2em] uppercase">Receiving Video Data Package</p>
                <div className="mt-4 flex gap-1 justify-center">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-1 w-8 rounded-full ${i < 3 ? 'bg-orange-500' : 'bg-zinc-800'}`}></div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-6 right-6 flex items-end flex-col gap-2">
                <div className="px-3 py-2 bg-zinc-900/90 border border-zinc-700 rounded-lg text-right">
                   <p className="text-[9px] text-zinc-500 uppercase font-bold">Bitrate</p>
                   <p className="text-sm font-mono text-white">4.2 Mbps</p>
                </div>
                <div className="px-3 py-2 bg-zinc-900/90 border border-zinc-700 rounded-lg text-right">
                   <p className="text-[9px] text-zinc-500 uppercase font-bold">Latency</p>
                   <p className="text-sm font-mono text-emerald-500">24ms</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-center">
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition-colors">
                <Monitor className="w-5 h-5" />
              </button>
              <button className="px-6 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-colors border border-red-500/20" onClick={() => setIsLive(false)}>
                DISCONNECT CHANNEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;