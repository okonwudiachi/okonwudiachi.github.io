/**
 * states.js
 * Bluebonnet Health Clinic — External State/Territory list
 * Requirement: State dropdown as an external include file (req 3j)
 * Usage: <script src="states.js"></script>
 *        then call: populateStateSelect('elementId')
 * Author: Onyemaechi Onwudiachi
 * Created: 03/11/2026
 * Last Edited: 03/27/2026
 */

const US_STATES = [
  { code: '',   name: 'Select…'            },
  { code: 'AL', name: 'Alabama'            },
  { code: 'AK', name: 'Alaska'             },
  { code: 'AZ', name: 'Arizona'            },
  { code: 'AR', name: 'Arkansas'           },
  { code: 'CA', name: 'California'         },
  { code: 'CO', name: 'Colorado'           },
  { code: 'CT', name: 'Connecticut'        },
  { code: 'DE', name: 'Delaware'           },
  { code: 'DC', name: 'District of Columbia'},
  { code: 'FL', name: 'Florida'            },
  { code: 'GA', name: 'Georgia'            },
  { code: 'HI', name: 'Hawaii'             },
  { code: 'ID', name: 'Idaho'              },
  { code: 'IL', name: 'Illinois'           },
  { code: 'IN', name: 'Indiana'            },
  { code: 'IA', name: 'Iowa'               },
  { code: 'KS', name: 'Kansas'             },
  { code: 'KY', name: 'Kentucky'           },
  { code: 'LA', name: 'Louisiana'          },
  { code: 'ME', name: 'Maine'              },
  { code: 'MD', name: 'Maryland'           },
  { code: 'MA', name: 'Massachusetts'      },
  { code: 'MI', name: 'Michigan'           },
  { code: 'MN', name: 'Minnesota'          },
  { code: 'MS', name: 'Mississippi'        },
  { code: 'MO', name: 'Missouri'           },
  { code: 'MT', name: 'Montana'            },
  { code: 'NE', name: 'Nebraska'           },
  { code: 'NV', name: 'Nevada'             },
  { code: 'NH', name: 'New Hampshire'      },
  { code: 'NJ', name: 'New Jersey'         },
  { code: 'NM', name: 'New Mexico'         },
  { code: 'NY', name: 'New York'           },
  { code: 'NC', name: 'North Carolina'     },
  { code: 'ND', name: 'North Dakota'       },
  { code: 'OH', name: 'Ohio'               },
  { code: 'OK', name: 'Oklahoma'           },
  { code: 'OR', name: 'Oregon'             },
  { code: 'PA', name: 'Pennsylvania'       },
  { code: 'RI', name: 'Rhode Island'       },
  { code: 'SC', name: 'South Carolina'     },
  { code: 'SD', name: 'South Dakota'       },
  { code: 'TN', name: 'Tennessee'          },
  { code: 'TX', name: 'Texas'              },
  { code: 'UT', name: 'Utah'               },
  { code: 'VT', name: 'Vermont'            },
  { code: 'VA', name: 'Virginia'           },
  { code: 'WA', name: 'Washington'         },
  { code: 'WV', name: 'West Virginia'      },
  { code: 'WI', name: 'Wisconsin'          },
  { code: 'WY', name: 'Wyoming'            },
  { code: 'PR', name: 'Puerto Rico'        }
];

/**
 * Populate a <select> element with the state list.
 * @param {string} selectId - ID of the <select> element
 * @param {string} [selectedCode] - Optional 2-letter code to pre-select
 */
function populateStateSelect(selectId, selectedCode) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';
  US_STATES.forEach(function(s) {
    const opt = document.createElement('option');
    opt.value = s.code;
    opt.textContent = s.name;
    if (s.code === '') opt.disabled = false; // null option is selectable so user sees prompt
    if (selectedCode && s.code === selectedCode) opt.selected = true;
    else if (!selectedCode && s.code === '') opt.selected = true;
    sel.appendChild(opt);
  });
}
