import {
    useMemo,
    useState,
    type ChangeEvent,
    type MouseEvent
} from "react";

export type LookupOption = {
    value: string;
    label: string;
    detail: string;
    searchText: string;
};

type SearchableLookupFieldProps = {
    label: string;
    name: string;
    value: string;
    options: LookupOption[];
    placeholder?: string;
    isLoading?: boolean;
    onChange: (value: string) => void;
};

const normalizeText = (value: string) => {
    return value.trim().toLowerCase();
};

const getOptionDisplayText = (option: LookupOption | undefined) => {
    if (option === undefined) {
        return "";
    }

    return `${option.label} - ${option.value}`;
};

export default function SearchableLookupField(
    props: SearchableLookupFieldProps
) {
    const {
        label,
        name,
        value,
        options,
        placeholder,
        isLoading = false,
        onChange
    } = props;

    const selectedOption = options.find((option) => {
        return option.value === value;
    });

    const [query, setQuery] = useState<string>(() => {
        return getOptionDisplayText(selectedOption) || value;
    });
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = normalizeText(query);

        if (normalizedQuery === "") {
            return options.slice(0, 12);
        }

        return options
            .filter((option) => {
                return normalizeText(option.searchText).includes(normalizedQuery);
            })
            .slice(0, 12);
    }, [options, query]);

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextQuery = event.target.value;

        setQuery(nextQuery);
        setIsOpen(true);

        if (value !== "") {
            onChange("");
        }
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const handleInputBlur = () => {
        setIsOpen(false);
    };

    const handleOptionMouseDown = (
        event: MouseEvent<HTMLButtonElement>,
        option: LookupOption
    ) => {
        event.preventDefault();
        onChange(option.value);
        setQuery(getOptionDisplayText(option));
        setIsOpen(false);
    };

    return (
        <label className="lookup-field">
            {label}
            <span className="lookup-control">
                <input
                    name={name}
                    type="text"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={`${name}-lookup-list`}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={placeholder}
                />

                {isOpen ? (
                    <span
                        className="lookup-list"
                        id={`${name}-lookup-list`}
                        role="listbox"
                    >
                        {isLoading ? (
                            <span className="lookup-empty">
                                Đang tải danh sách...
                            </span>
                        ) : null}

                        {!isLoading && filteredOptions.length === 0 ? (
                            <span className="lookup-empty">
                                Không có dữ liệu phù hợp
                            </span>
                        ) : null}

                        {!isLoading && filteredOptions.map((option) => (
                            <button
                                className="lookup-option"
                                type="button"
                                key={option.value}
                                onMouseDown={(event) => {
                                    handleOptionMouseDown(
                                        event,
                                        option
                                    );
                                }}
                            >
                                <strong>{option.label}</strong>
                                <span>{option.detail}</span>
                            </button>
                        ))}
                    </span>
                ) : null}
            </span>
        </label>
    );
}
