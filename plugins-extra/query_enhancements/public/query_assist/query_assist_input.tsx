import { EuiFieldText, EuiIcon, EuiOutsideClickDetector, EuiPortal } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { PersistedLog, QuerySuggestionTypes, SuggestionsComponent } from '../../../../src/plugins/data/public';
import assistantLogo from '../assets/query_assist_logo.svg';

interface QueryAssistInputProps {
  inputRef: React.RefObject<HTMLInputElement>;
  persistedLog: PersistedLog;
}

export const QueryAssistInput: React.FC<QueryAssistInputProps> = (props) => {
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (props.inputRef.current) props.inputRef.current.value = 'what are the errors?';
  }, []);

  const getRecentSearchSuggestions = (query: string) => {
    if (!props.persistedLog) {
      return [];
    }
    const recentSearches = props.persistedLog.get();
    const matchingRecentSearches = recentSearches.filter((recentQuery) => {
      const recentQueryString = typeof recentQuery === 'object' ? recentQuery : recentQuery;
      return recentQueryString.includes(query);
    });
    return matchingRecentSearches.map((recentSearch) => {
      const text = recentSearch;
      const start = 0;
      const end = query.length;
      return { type: QuerySuggestionTypes.RecentSearch, text, start, end };
    });
  };

  return (
    <>
      <EuiOutsideClickDetector onOutsideClick={() => setIsSuggestionsVisible(false)}>
        <div>
          <EuiFieldText
            inputRef={props.inputRef}
            // disabled={loading}
            onClick={() => setIsSuggestionsVisible(true)}
            onKeyDown={() => setIsSuggestionsVisible(true)}
            placeholder={`Ask a natural language question about TODO to generate a query`}
            prepend={<EuiIcon type={assistantLogo} />}
            fullWidth
          />
          <EuiPortal>
            <SuggestionsComponent
              show={isSuggestionsVisible}
              suggestions={getRecentSearchSuggestions(props.inputRef.current?.value || '')}
              index={index}
              onClick={(suggestion) => {
                if (!props.inputRef.current) return;
                props.inputRef.current.value = suggestion.text;
                setIsSuggestionsVisible(false);
                setIndex(null);
                props.inputRef.current.focus();
              }}
              onMouseEnter={(i) => setIndex(i)}
              loadMore={() => {}}
              queryBarRect={props.inputRef.current?.getBoundingClientRect()}
              size="s"
            />
          </EuiPortal>
        </div>
      </EuiOutsideClickDetector>
    </>
  );
};
