import { useState } from 'react'
import { FileIcon, UploadIcon, TrashIcon, CheckCircleIcon, CircleIcon } from './Icons'

type Theme = 'light' | 'dark' | 'pinktasha'
type FilterType = 'all' | 'reports' | 'evaluations' | 'certificates'

interface FilesSectionProps {
  theme: Theme
}

interface FileItem {
  id: string
  name: string
  size: string
  date: string
  status: 'approved' | 'pending'
  type: 'report' | 'evaluation' | 'certificate'
}

const filesData: FileItem[] = [
  {
    id: '1',
    name: 'Week 4 Report.pdf',
    size: '2.4 MB',
    date: 'Uploaded Today',
    status: 'approved',
    type: 'report',
  },
  {
    id: '2',
    name: 'Evaluation Form.docx',
    size: '1.1 MB',
    date: 'Uploaded Yesterday',
    status: 'pending',
    type: 'evaluation',
  },
  {
    id: '3',
    name: 'Medical Certificate.pdf',
    size: '850 KB',
    date: 'Uploaded Feb 15',
    status: 'approved',
    type: 'certificate',
  },
]

const requirements = [
  { name: 'Resume / CV', completed: true },
  { name: 'Medical Certificate', completed: true },
  { name: 'Endorsement Letter', completed: false },
  { name: 'Final Evaluation', completed: false },
]

export function FilesSection({ theme }: FilesSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const isDark = theme === 'dark'
  const primaryBg = theme === 'pinktasha' ? 'bg-[#F13E93]' : 'bg-[#43A6FF]'
  const primaryHover = theme === 'pinktasha' ? 'hover:bg-[#d62d7a]' : 'hover:bg-[#3490E5]'
  const accentBg = theme === 'pinktasha' ? 'bg-[#F9D0CD]' : 'bg-blue-50'
  const accentText = theme === 'pinktasha' ? 'text-[#F13E93]' : 'text-[#43A6FF]'

  const filteredFiles =
    activeFilter === 'all'
      ? filesData
      : filesData.filter((file) => {
          if (activeFilter === 'reports') return file.type === 'report'
          if (activeFilter === 'evaluations') return file.type === 'evaluation'
          if (activeFilter === 'certificates') return file.type === 'certificate'
          return true
        })

  const getFilterButtonClass = (filter: FilterType) => {
    const isActive = activeFilter === filter
    if (isActive) {
      return 'bg-gray-900 text-white shadow-sm border-transparent'
    }
    return isDark
      ? 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
  }

  const getFileIconClass = (status: string) => {
    if (status === 'approved') {
      return `${accentBg} ${accentText} border-blue-100`
    }
    return isDark
      ? 'bg-gray-800 text-gray-500 border-gray-700'
      : 'bg-gray-50 text-gray-400 border-gray-100'
  }

  const getStatusBadgeClass = (status: string) => {
    if (status === 'approved') {
      return 'bg-green-50 text-green-700'
    }
    return 'bg-yellow-50 text-yellow-700'
  }

  return (
    <div className="w-full px-10 py-12">
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className={`text-3xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Document Hub.
          </h1>
          <p className={`text-base mt-2 font-medium ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Upload and manage your required OJT files.
          </p>
        </div>
        <button className={`flex items-center text-white px-6 py-3.5 rounded-full font-bold transition-transform hover:scale-[1.02] shadow-sm ${
          primaryBg
        } ${primaryHover} ${
          theme === 'pinktasha' ? 'shadow-pink-200' : 'shadow-blue-200'
        }`}>
          <UploadIcon />
          <span className="ml-2">Upload File</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Files Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'reports', label: 'Weekly Reports' },
              { id: 'evaluations', label: 'Evaluations' },
              { id: 'certificates', label: 'Certificates' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as FilterType)}
                className={`font-bold px-5 py-2.5 rounded-full text-sm shrink-0 border transition-colors ${
                  getFilterButtonClass(filter.id as FilterType)
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Files List */}
          <div className="space-y-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`rounded-[24px] p-6 transition-transform hover:translate-y-[-2px] duration-300 border flex items-center justify-between group ${
                  isDark
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center shadow-sm border ${getFileIconClass(file.status)}`}>
                    <FileIcon />
                  </div>
                  <div className="ml-4">
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {file.name}
                    </h3>
                    <p className={`text-sm font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {file.size} • {file.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`font-bold px-3 py-1.5 rounded-full text-xs uppercase tracking-wide ${getStatusBadgeClass(file.status)}`}>
                    {file.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                  <button className={`transition-colors p-2 opacity-0 group-hover:opacity-100 focus:opacity-100 ${
                    isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                  }`}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Quick Upload Zone */}
          <div className={`rounded-[24px] p-8 border-2 border-dashed cursor-pointer text-center group transition-colors ${
            isDark
              ? 'bg-gray-800 border-gray-600 hover:border-[#43A6FF] hover:bg-gray-700/50'
              : 'bg-white border-gray-200 hover:border-[#43A6FF] hover:bg-blue-50/50'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform ${
              isDark ? 'bg-gray-700 text-gray-400' : accentBg + ' ' + accentText
            }`}>
              <UploadIcon />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Drag & Drop
            </h3>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              or click to browse your files. Limit 10MB.
            </p>
          </div>

          {/* OJT Requirements Checklist */}
          <div className={`rounded-[24px] p-8 relative overflow-hidden group ${
            theme === 'pinktasha'
              ? 'bg-[#F13E93]'
              : 'bg-[#43A6FF]'
          } shadow-[0_8px_30px_rgba(67,166,255,0.2)] text-white`}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700 ease-in-out"></div>
              <div className="absolute -bottom-10 -right-4 w-28 h-28 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-700 ease-in-out delay-75"></div>
            </div>

            <h2 className="text-lg font-bold mb-2 relative z-10">Requirements</h2>
            <p className="text-sm font-medium text-white/80 mb-6 relative z-10">
              Track your mandatory submissions.
            </p>

            <div className="space-y-4 relative z-10">
              {requirements.map((req) => (
                <div key={req.name} className={`flex items-center ${!req.completed ? 'opacity-70' : ''}`}>
                  <span className="text-white mr-3">
                    {req.completed ? <CheckCircleIcon /> : <CircleIcon className="text-white/60" />}
                  </span>
                  <span className="font-bold text-white text-sm">{req.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
