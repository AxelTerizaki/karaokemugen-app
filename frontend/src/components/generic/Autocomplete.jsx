// ------------------------------------------------------------------------
// ------------------------------------------------------------------------
// AUTOCOMPLETE COMPONENT
// ------------------------------------------------------------------------
// ------------------------------------------------------------------------

import React, {useState, useRef, useEffect} from  "react";
import "./Autocomplete.scss";

function Autocomplete(props){

  const options = props.options || [];

  const node = useRef();
  const [placeholder, setPlaceholder] = useState(props.placeholder || null);
  const [selectedValue, setSelectedValue] = useState(props.value || "");

  let temp = "";
  if(selectedValue) {
    temp = options.filter((o) => o.value === selectedValue);
    if(temp.length)
      temp = temp[0].label;
  }
  const [searchValue, setSearchValue] = useState(temp);

  const searchInputRef = useRef();
  const [activeIndex, setActiveIndex] = useState(0);
  const [focus, setFocus] = useState(false);
  var blurDelay = null;

  const updateSelectedValue = (v) => {
    setSelectedValue(v);
    if(typeof props.onChange==="function")
      props.onChange(v);
    return;
  }

  // INPUT USER EVENT
  const handleInputFocus = (e) => {
    setTimeout(() => setFocus(true) , 250);
    setSearchValue("");
  };

  const handleInputClick = (e) => {
    setFocus(!focus);
  };

  // SEARCH USER EVENT
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setActiveIndex(0);
  };
  const handleSearchKeyUp = (e) => {
    var fo = filteredOptions();
    if(e.keyCode===13) {
      //RETURN
      setFocus(false);
      let o = fo[activeIndex];
      if (props.acceptNewValues) {
        updateSelectedValue(e.target.value);
      } else if(o) {
        updateSelectedValue(o.value);
      }
    }
    else if(e.keyCode===27) //ESC
      setFocus(false);
    else if(e.keyCode===40) //DOWN
      setActiveIndex(fo.length > 0 ? Math.min(activeIndex+1, fo.length-1) : 0);
    else if(e.keyCode===38) //UP
      setActiveIndex(fo.length > 0 ? Math.max(activeIndex-1, 0) : 0);
  };

  const handleOptionSelection = (o) => {
    setFocus(false);
    updateSelectedValue(o.value);
    setSearchValue(o.label);
    setPlaceholder(o.label);
  };

  const filteredOptions = () => options.filter((o) => {
    return String(o.label).toLowerCase().match(RegExp.escape(searchValue.toLowerCase()))
      || String(o.value).toLowerCase().match(RegExp.escape(searchValue.toLowerCase()));
  });

  const handleClick = e => {
    if (node.current.contains(e.target)) {
      // inside click
      return;
    }
    // outside click
    setFocus(false);
  };

  useEffect(() => {
    if(focus)
      searchInputRef.current.focus();
    // add when mounted
    document.addEventListener("mousedown", handleClick);
    // return function to be called when unmounted
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [focus]); // executé au démarrage puis en cas de mise à jour de focus

  return (
    <div className="UI-autocomplete" ref={node}>
      <div className="UI-autocomplete-input" focus={focus ? "true":"false"}>
        <input type="text"
          data-exclude={true}
          ref={searchInputRef}
          value={searchValue}
          placeholder={placeholder}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          onChange={handleSearchChange}
          onKeyUp={handleSearchKeyUp}
        />
        <ul className="UI-autocomplete-options">
          <div className="UI-autocomplete-options-wrapper">
            {filteredOptions().map((o,index) => <li className="UI-autocomplete-option" index={index} active={index==activeIndex ? "true":"false"} key={index} onClick={() => handleOptionSelection(o)}>{o.label}</li>)}
          </div>
        </ul>
      </div>
    </div>
  )
}

export default Autocomplete;