import { useState } from 'react'
import { GitBranch, HelpCircle, Info } from 'lucide-react'
import { cn } from '../../lib/utils'
import Tooltip from '../TooltipPortal'

const LOGIC_EXPLANATIONS = {
  all: {
    title: 'Match ALL filters (AND)',
    description: 'Results must match every filter you\'ve set',
    example: 'If you search for "Title contains dragon" AND "Type is Image", only images with "dragon" in the title will be shown.',
    visual: '🔍 Filter 1 ✓ AND Filter 2 ✓ AND Filter 3 ✓ = Result ✓'
  },
  any: {
    title: 'Match ANY filter (OR)', 
    description: 'Results can match any one of your filters',
    example: 'If you search for "Title contains dragon" OR "Description contains dragon", items with "dragon" in either field will be shown.',
    visual: '🔍 Filter 1 ✓ OR Filter 2 ✗ OR Filter 3 ✗ = Result ✓'
  }
}

export default function StepThree({ data, onChange, metadataFields, compact = false }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const handleGlobalOperatorChange = (operator) => {
    onChange({ globalOperator: operator })
  }
  
  const handleFieldOperatorChange = (fieldId, operator) => {
    onChange({
      fieldOperators: {
        ...data.fieldOperators,
        [fieldId]: operator
      }
    })
  }
  
  // Get active metadata fields that have multiple values
  const multiValueFields = Object.entries(data.metadataFields || {})
    .filter(([fieldId, fieldData]) => Array.isArray(fieldData.value) && fieldData.value.length > 1)
    .map(([fieldId, fieldData]) => {
      const field = metadataFields.find(f => f.ref === parseInt(fieldId))
      return { fieldId, field, data: fieldData }
    })
  
  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {/* Main Logic Selection */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-art-accent" />
              How should your filters work together?
            </h3>
            <p className="text-sm text-art-gray-400 mt-1">
              Choose how ResourceSpace combines your search criteria
            </p>
          </div>
          <Tooltip content="This determines whether results need to match all your filters or just some of them.">
            <button className="p-1 hover:bg-art-gray-700 rounded">
              <HelpCircle className="h-4 w-4 text-art-gray-400" />
            </button>
          </Tooltip>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Match ALL Option */}
          <button
            onClick={() => handleGlobalOperatorChange('all')}
            className={cn(
              "p-6 rounded-lg border-2 text-left transition-all",
              data.globalOperator === 'all'
                ? "border-art-accent bg-art-accent/10"
                : "border-art-gray-700 hover:border-art-gray-600"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                data.globalOperator === 'all' 
                  ? "border-art-accent bg-art-accent" 
                  : "border-art-gray-600"
              )}>
                {data.globalOperator === 'all' && (
                  <div className="w-3 h-3 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white mb-2">{LOGIC_EXPLANATIONS.all.title}</h4>
                <p className="text-sm text-art-gray-400 mb-3">{LOGIC_EXPLANATIONS.all.description}</p>
                <div className="bg-art-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-art-gray-500 mb-2">Example:</p>
                  <p className="text-xs text-art-gray-300">{LOGIC_EXPLANATIONS.all.example}</p>
                </div>
                <div className="mt-3 p-2 bg-art-gray-900/30 rounded text-xs font-mono text-art-accent">
                  {LOGIC_EXPLANATIONS.all.visual}
                </div>
              </div>
            </div>
          </button>
          
          {/* Match ANY Option */}
          <button
            onClick={() => handleGlobalOperatorChange('any')}
            className={cn(
              "p-6 rounded-lg border-2 text-left transition-all",
              data.globalOperator === 'any'
                ? "border-art-accent bg-art-accent/10"
                : "border-art-gray-700 hover:border-art-gray-600"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                data.globalOperator === 'any' 
                  ? "border-art-accent bg-art-accent" 
                  : "border-art-gray-600"
              )}>
                {data.globalOperator === 'any' && (
                  <div className="w-3 h-3 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white mb-2">{LOGIC_EXPLANATIONS.any.title}</h4>
                <p className="text-sm text-art-gray-400 mb-3">{LOGIC_EXPLANATIONS.any.description}</p>
                <div className="bg-art-gray-900/50 rounded-lg p-3">
                  <p className="text-xs text-art-gray-500 mb-2">Example:</p>
                  <p className="text-xs text-art-gray-300">{LOGIC_EXPLANATIONS.any.example}</p>
                </div>
                <div className="mt-3 p-2 bg-art-gray-900/30 rounded text-xs font-mono text-art-accent">
                  {LOGIC_EXPLANATIONS.any.visual}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
      
      {/* Advanced Field-Level Logic */}
      {multiValueFields.length > 0 && (
        <div className="bg-art-gray-800/50 rounded-lg p-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <div>
              <h3 className="text-lg font-medium text-white">Advanced: Field-level logic</h3>
              <p className="text-sm text-art-gray-400 mt-1">
                Fine-tune how multiple values within the same field work
              </p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs",
              showAdvanced ? "bg-art-accent text-white" : "bg-art-gray-700 text-art-gray-300"
            )}>
              {showAdvanced ? 'Hide' : 'Show'}
            </div>
          </button>
          
          {showAdvanced && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-300">
                  When you have multiple values in a single field (like multiple keywords), 
                  you can control whether items need to match all values or just one.
                </p>
              </div>
              
              {multiValueFields.map(({ fieldId, field, data: fieldData }) => (
                <div key={fieldId} className="p-4 bg-art-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">
                      {field?.title || field?.name || `Field ${fieldId}`}
                    </h4>
                    <div className="text-sm text-art-gray-400">
                      {fieldData.value.length} values
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {fieldData.value.map((val, index) => (
                      <span key={index} className="px-2 py-1 bg-art-gray-600 text-white text-sm rounded">
                        {val}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={(data.fieldOperators?.[fieldId] || 'or') === 'or'}
                        onChange={() => handleFieldOperatorChange(fieldId, 'or')}
                        className="w-4 h-4 text-art-accent"
                      />
                      <span className="text-sm text-white">Match ANY value (OR)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={(data.fieldOperators?.[fieldId] || 'or') === 'and'}
                        onChange={() => handleFieldOperatorChange(fieldId, 'and')}
                        className="w-4 h-4 text-art-accent"
                      />
                      <span className="text-sm text-white">Match ALL values (AND)</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Visual Preview */}
      <div className="bg-art-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Your search logic visualized</h3>
        
        <div className="p-4 bg-art-gray-900/50 rounded-lg font-mono text-sm">
          <div className="text-art-gray-400 mb-2">// Your search will work like this:</div>
          
          {data.keywords && (
            <div className="text-art-accent">Keywords: "{data.keywords}"</div>
          )}
          
          {data.fileTypes?.length > 0 && (
            <>
              <div className="text-art-gray-600 my-1">
                {data.globalOperator === 'all' ? 'AND' : 'OR'}
              </div>
              <div className="text-art-accent">
                File types: {data.fileTypes.join(', ')}
              </div>
            </>
          )}
          
          {Object.keys(data.metadataFields || {}).length > 0 && (
            <>
              <div className="text-art-gray-600 my-1">
                {data.globalOperator === 'all' ? 'AND' : 'OR'}
              </div>
              <div className="text-art-accent">
                {Object.keys(data.metadataFields).length} metadata filter{Object.keys(data.metadataFields).length !== 1 ? 's' : ''}
              </div>
            </>
          )}
          
          <div className="mt-4 pt-4 border-t border-art-gray-700 text-art-gray-400">
            = Results that {data.globalOperator === 'all' ? 'match ALL' : 'match ANY'} of the above
          </div>
        </div>
      </div>
    </div>
  )
}