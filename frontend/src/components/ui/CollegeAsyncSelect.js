import AsyncSelect from 'react-select/async';

const CollegeAsyncSelect = ({
    colleges = [],
    value,
    onChange,
    placeholder = 'Search & select college...',
    isClearable = true
}) => {

    const loadOptions = (inputValue, callback) => {
        setTimeout(() => {
            const filtered = colleges
                .filter(c =>
                    c.name.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map(c => ({
                    value: c._id,
                    label: c.name
                }));

            callback(filtered);
        }, 300);
    };

    const selectedValue =
        colleges
            .filter(c => c._id === value)
            .map(c => ({ value: c._id, label: c.name }))[0] || null;

    return (
        <AsyncSelect
            cacheOptions=""
            defaultOptions={colleges.map(c => ({
                value: c._id,
                label: c.name
            }))}
            loadOptions={loadOptions}
            value={selectedValue}
            onChange={(selected) => onChange(selected?.value || '')}
            placeholder={placeholder}
            isClearable={isClearable}
        />
    );
};

export default CollegeAsyncSelect;
