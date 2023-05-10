import './Products.css'
import {useEffect, useRef, useState} from "react";

export function Products() {
    return (<FilterableProductTable products={PRODUCTS}/>)
}

function FilterableProductTable({products}) {

    const [nameFilterText, setNameFilterText] = useState("");
    const [showOnlyInStock, setShowOnlyInStock] = useState(false);

    let filteredProducts = products
        .filter(product => nameFilterText === "" || product.name.toLowerCase().includes(nameFilterText.toLowerCase()))
        .filter(product => !showOnlyInStock || product.stocked);

    function filter({name, onlyInStock}) {
        setNameFilterText(name);
        setShowOnlyInStock(onlyInStock);
    }

    return (
        <>
            <SearchBar onFilter={filter}/>
            <ProductTable products={filteredProducts}/>
        </>
    );
}

function SearchBar({onFilter}) {
    const searchNameRef = useRef(null);
    const showOnlyInStockRef = useRef(null);

    function onFilterChange() {
        onFilter({
            name: searchNameRef.current.value,
            onlyInStock: showOnlyInStockRef.current.checked
        });
    }

    return (
        <form>
            <input type="text" placeholder="Search..." ref={searchNameRef} onChange={onFilterChange}/>
            <label>
                <input type="checkbox" ref={showOnlyInStockRef} onChange={onFilterChange}/>
                {' '}
                Only show products in stock
            </label>
        </form>
    );
}

function ProductTable({products}) {
    let lastCategory = '';
    const rows = [];
    products
        .sort((cat1, cat2) => cat1.category.localeCompare(cat2.category))
        .forEach((product) => {
            if (product.category !== lastCategory) {
                lastCategory = product.category;
                rows.push(<ProductCategoryRow categoryName={lastCategory}/>);
            }
            rows.push(<ProductRow product={product}/>);
        });
    return (<table>
        <thead>
        <tr>
            <th>Name</th>
            <th>Price</th>
        </tr>
        </thead>
        <tbody>
        {rows}
        </tbody>
    </table>);
}

function ProductCategoryRow({categoryName}) {
    return (<tr>
        <td className="product-category">{categoryName}</td>
    </tr>);
}

function ProductRow({product}) {
    return (<tr>
        <td className={"product-name" + (product.stocked ? "" : " out-of-stock-product")}>{product.name}</td>
        <td>{product.price}</td>
    </tr>);
}

const PRODUCTS = [
    {category: "Fruits", price: "$1", stocked: true, name: "Apple"},
    {category: "Fruits", price: "$1", stocked: true, name: "Dragonfruit"},
    {category: "Fruits", price: "$2", stocked: false, name: "Passionfruit"},
    {category: "Vegetables", price: "$2", stocked: true, name: "Spinach"},
    {category: "Vegetables", price: "$4", stocked: false, name: "Pumpkin"},
    {category: "Vegetables", price: "$1", stocked: true, name: "Peas"}
];