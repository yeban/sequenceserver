import React from 'react';

/**
 * Prettifies numbers and arrays.
 */
export function prettify (data) {
    if (this.isTuple(data)) {
        return this.prettify_tuple(data);
    }
    if (this.isFloat(data)) {
        return this.prettify_float(data);
    }
    return data
}

/**
 * Formats float as "a.bc" or "a x b^c". The latter if float is in
 * scientific notation. Former otherwise.
 */
export function prettify_float (data) {
    var matches = data.toString().split("e");
    var base  = matches[0];
    var power = matches[1];

    if (power)
        {
            var s = parseFloat(base).toFixed(2);
            var element = <span>{s} &times; 10<sup>{power}</sup></span>;
            return element;
        }
        else {
            if(!(base % 1==0)) {
                if (parseFloat(base).toFixed(2) == 0.00) {
                    return parseFloat(base).toFixed(5)
                }
                return parseFloat(base).toFixed(2);
            } else {
                return base;
            }
        }
}

// Formats an array of two elements as "first (last)".
export function prettify_tuple (tuple) {
    return (tuple[0] + " (" + tuple[tuple.length - 1] + ")");
}

// Checks if data is an array.
export function isTuple (data) {
    return (Array.isArray(data) && data.length == 2)
}

// Checks if data if float.
export function isFloat (data) {
    return (typeof(data) == 'number' ||
            (typeof(data) == 'string' &&
             data.match(/(\d*\.\d*)e?([+-]\d+)?/)))
}

/**
 * Render URL for sequence-viewer.
 */
export function a (link , hitlength) {
    if (link.title && link.url)
    {
        return (
                <a href={link.url} className={link.class} target='_blank'>
                {link.icon && <i className={"fa " + link.icon}></i>}
                {" " + link.title + " "}
                </a>
               );
    }
}

/**
 * Returns fraction as percentage
 */
export function inPercentage (num , den) {
    return (num * 100.0 / den).toFixed(2);
}

/**
 * Returns fractional representation as String.
 */
export function inFraction (num , den) {
    return num + "/" + den;
}

/**
 * Returns given Float as String formatted to two decimal places.
 */
export function inTwoDecimal (num) {
    return parseFloat(num).toFixed(2)
}

/**
 * Formats the given number as "1e-3" if the number is less than 1 or
 * greater than 10.
 */
export function inScientificOrTwodecimal (num) {
    if (num >= 1 && num < 10)
        {
            return this.inTwoDecimal(num)
        }
        return num.toExponential(2);
}
