import { SearchIcon, UserPlusIcon } from './Icons'

type Theme = 'light' | 'dark' | 'pinktasha'

interface FriendsSectionProps {
  theme: Theme
}

interface Friend {
  id: string
  name: string
  role: string
  initials: string
  color: string
  isActive: boolean
  status: string
  schedule: string
  progress: number
  totalHours: number
}

interface FriendRequest {
  id: string
  name: string
  initials: string
  role: string
}

const friends: Friend[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    role: 'UI/UX Design Intern',
    initials: 'S',
    color: 'bg-orange-100 text-orange-600',
    isActive: true,
    status: 'On Shift',
    schedule: 'Weekday Schedule',
    progress: 520,
    totalHours: 600,
  },
  {
    id: '2',
    name: 'Marcus Chen',
    role: 'Frontend Developer',
    initials: 'M',
    color: 'bg-purple-100 text-purple-600',
    isActive: false,
    status: 'Offline',
    schedule: 'Last active 2h ago',
    progress: 300,
    totalHours: 600,
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    role: 'Backend Developer',
    initials: 'E',
    color: 'bg-pink-100 text-pink-600',
    isActive: true,
    status: 'On Shift',
    schedule: 'Weekend Overtime',
    progress: 450,
    totalHours: 600,
  },
]

const friendRequests: FriendRequest[] = [
  {
    id: '1',
    name: 'David Kim',
    initials: 'D',
    role: 'Software Engineer Intern',
  },
]

export function FriendsSection({ theme }: FriendsSectionProps) {
  const isDark = theme === 'dark'
  const primaryBg = theme === 'pinktasha' ? 'bg-[#F13E93]' : 'bg-[#43A6FF]'
  const primaryHover = theme === 'pinktasha' ? 'hover:bg-[#d62d7a]' : 'hover:bg-[#3490E5]'
  const accentBg = theme === 'pinktasha' ? 'bg-[#F9D0CD]' : 'bg-blue-50'
  const accentText = theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'

  return (
    <div className="w-full px-10 py-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Your Network.
          </h1>
          <p className={`text-base mt-2 font-medium ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Track progress and see who is currently working.
          </p>
        </div>
        <button className={`flex items-center text-white px-6 py-3.5 rounded-full font-bold transition-transform hover:scale-[1.02] shadow-sm ${
          primaryBg
        } ${primaryHover} ${
          theme === 'pinktasha' ? 'shadow-pink-200' : 'shadow-blue-200'
        }`}>
          <UserPlusIcon />
          <span className="ml-2">Add Friend</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Friends List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <div className={`absolute inset-y-0 left-4 flex items-center pointer-events-none ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search friends by name or role..."
              className={`w-full pl-12 pr-4 py-4 rounded-[20px] border-none outline-none focus:ring-2 text-sm font-medium transition-all ${
                isDark
                  ? 'bg-gray-800 text-white focus:ring-[#43A6FF] placeholder-gray-500'
                  : 'bg-white text-gray-900 focus:ring-[#43A6FF] placeholder-gray-400 shadow-[0_4px_24px_rgba(0,0,0,0.02)]'
              }`}
            />
          </div>

          {/* Friend Cards */}
          <div className="space-y-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className={`rounded-[24px] p-6 transition-transform hover:translate-y-[-2px] duration-300 border-2 ${
                  isDark
                    ? 'bg-gray-800 border-transparent hover:border-[#43A6FF]/20'
                    : 'bg-white border-transparent hover:border-[#43A6FF]/20 shadow-[0_4px_24px_rgba(0,0,0,0.02)]'
                } ${friend.isActive ? (isDark ? 'border-[#43A6FF]/30' : 'hover:border-[#43A6FF]/20') : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center font-black text-xl shadow-sm ${friend.color}`}>
                        {friend.initials}
                      </div>
                      {friend.isActive && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {friend.name}
                      </h3>
                      <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {friend.role}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold px-3 py-1.5 rounded-full text-xs uppercase tracking-wide flex items-center ${
                      friend.isActive
                        ? 'bg-green-50 text-green-700'
                        : isDark
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {friend.isActive && (
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      )}
                      {friend.status}
                    </span>
                    <p className={`text-xs font-bold mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {friend.schedule}
                    </p>
                  </div>
                </div>

                <div className={`mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-50'}`}>
                  <div className="flex justify-between items-end mb-2">
                    <span className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Progress
                    </span>
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {friend.progress}{' '}
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                        / {friend.totalHours} hrs
                      </span>
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div
                      className={`h-full rounded-full ${primaryBg} ${!friend.isActive ? 'opacity-60' : ''}`}
                      style={{ width: `${(friend.progress / friend.totalHours) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Requests & Summary Panel */}
        <div className="space-y-6">
          {/* Friend Requests */}
          <div className={`rounded-[24px] p-8 h-fit border ${
            isDark
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]'
          }`}>
            <h2 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Friend Requests
            </h2>

            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-start">
                <div className={`w-10 h-10 ${accentBg} ${accentText} rounded-xl flex items-center justify-center font-bold shadow-sm`}>
                  {request.initials}
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {request.name}
                  </p>
                  <p className={`text-xs font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {request.role}
                  </p>
                  <div className="flex space-x-2">
                    <button className={`flex-1 text-white font-bold py-2 rounded-xl text-xs transition-colors ${primaryBg} ${primaryHover}`}>
                      Accept
                    </button>
                    <button className={`flex-1 font-bold py-2 rounded-xl text-xs transition-colors ${
                      isDark
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Network Summary */}
          <div className={`rounded-[24px] p-8 relative overflow-hidden group ${
            theme === 'pinktasha'
              ? 'bg-[#F13E93]'
              : 'bg-[#43A6FF]'
          } shadow-[0_8px_30px_rgba(67,166,255,0.2)] text-white`}>
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700 ease-in-out"></div>
              <div className="absolute -bottom-10 -right-4 w-28 h-28 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700 ease-in-out delay-75"></div>
              <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <h2 className="text-lg font-bold mb-2 relative z-10">Network Summary</h2>
            <p className="text-sm font-medium text-white/80 mb-8 relative z-10">
              Your connections at a glance.
            </p>

            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-end border-b border-white/20 pb-4">
                <span className="font-bold text-white/90 text-sm">Total Friends</span>
                <span className="text-3xl font-black leading-none">12</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex items-center">
                  <span className="relative flex h-2.5 w-2.5 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
                  </span>
                  <span className="font-bold text-white/90 text-sm">Working Now</span>
                </div>
                <span className="text-3xl font-black leading-none">2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
