import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

/**
 * SearchableSelect - A custom dropdown with search functionality
 * 
 * Usage:
 * <SearchableSelect
 *   value={selectedId}
 *   onChange={(value) => setField('animalId', value)}
 *   options={animals}
 *   getLabel={(animal) => animal.name}
 *   getValue={(animal) => animal.id}
 *   placeholder="Select cat..."
 * />
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  getLabel,
  getValue,
  placeholder = 'Select...'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredOptions = options.filter(option =>
    getLabel(option).toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find(opt => getValue(opt) === value)
    ? getLabel(options.find(opt => getValue(opt) === value))
    : placeholder;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  function handleSelect(option) {
    onChange(getValue(option));
    setIsOpen(false);
    setSearch('');
  }

  return (
    <div className="searchableSelectContainer" ref={containerRef}>
      <button
        type="button"
        className="searchableSelectButton"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : '' }} />
      </button>

      {isOpen && (
        <div className="searchableSelectDropdown">
          <div className="searchableSelectSearch">
            <Search size={16} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
            />
          </div>

          <div className="searchableSelectOptions">
            {filteredOptions.length === 0 ? (
              <div className="searchableSelectEmpty">No matches</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={getValue(option)}
                  type="button"
                  className={`searchableSelectOption ${
                    getValue(option) === value ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {getLabel(option)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
